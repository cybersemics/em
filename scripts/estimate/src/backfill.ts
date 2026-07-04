/**
 * Backfills Everhour estimates for GitHub issues that have no estimate yet.
 * Run manually: node --experimental-strip-types scripts/estimate/src/backfill.ts
 *
 * Traverses all Everhour project tasks → filters to those missing estimates →
 * fetches the corresponding GitHub issue → runs AI inference → writes the
 * estimate back to Everhour and leaves an audit comment on the GitHub issue.
 */
import { execSync } from 'child_process'
import 'dotenv/config'
import { fileURLToPath } from 'url'
import estimateIssue from './estimation/estimateIssue.js'
import loadInstructions from './estimation/loadInstructions.js'
import loadSamples from './estimation/loadSamples.js'
import EverhourClient from './everhour/client.js'
import extractIssueNumber from './everhour/extractIssueNumber.js'

/**
 * Gets the short git commit hash of the most recent change to the instructions directory.
 * Used to tag AI-generated estimates with the prompt version for auditability.
 */
const getPromptVersion = (repoRoot: string): string => {
  try {
    return execSync('git log -1 --format=%h -- .github/instructions/estimate', {
      cwd: repoRoot,
      encoding: 'utf-8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

interface GitHubIssue {
  number: number
  title: string
  body: string | null
  labels: Array<{ name: string }>
}

/**
 * Searches GitHub for an issue matching the given title exactly.
 * Used as a fallback when the Everhour task ID does not encode the issue number.
 */
const findIssueByTitle = async (
  title: string,
  owner: string,
  repoName: string,
  githubToken: string,
): Promise<number | null> => {
  const query = encodeURIComponent(`repo:${owner}/${repoName} in:title "${title}"`)
  const resp = await fetch(`https://api.github.com/search/issues?q=${query}&per_page=5`, {
    headers: { Authorization: `Bearer ${githubToken}` },
  })
  if (!resp.ok) return null
  const data = (await resp.json()) as { items: Array<{ number: number; title: string }> }
  const exact = data.items.find(item => item.title === title)
  return exact?.number ?? null
}

/**
 * Runs AI inference on a GitHub issue and writes the resulting estimate to Everhour.
 * Skips if dryRunAI is true (logs what would happen) or dryRunEverhour is true (skips Everhour write).
 */
const processTask = async ({
  issue,
  taskId,
  everhour,
  githubToken,
  owner,
  repoName,
  instructions,
  samples,
  promptVersion,
  dryRunAI,
  dryRunEverhour,
}: {
  issue: GitHubIssue
  taskId: string
  everhour: EverhourClient
  githubToken: string
  owner: string
  repoName: string
  instructions: string
  samples: ReturnType<typeof loadSamples>
  promptVersion: string
  dryRunAI: boolean
  dryRunEverhour: boolean
}): Promise<void> => {
  if (dryRunAI) {
    console.info(`  [DRY_RUN_AI] Would estimate issue #${issue.number}: "${issue.title}"`)
    return
  }

  const { category, hours, seconds } = await estimateIssue({
    issue: {
      title: issue.title,
      body: issue.body!,
      labels: issue.labels.map(l => l.name),
    },
    instructions,
    samples,
    token: githubToken,
  })

  if (!dryRunEverhour) {
    await everhour.setEstimate(taskId, seconds)
  } else {
    console.info(`  [DRY_RUN_EVERHOUR] Would set Everhour estimate for ${taskId}: ${category} / ${hours}h`)
  }

  // Leave audit comment on GitHub issue
  const commentBody = `Everhour estimate: ${category} / ${hours}h\nPrompt version: \`${promptVersion}\`\nSource: backfill`
  await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${issue.number}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: commentBody }),
  })

  console.info(`  Estimated issue #${issue.number}: ${category} / ${hours}h`)
}

const main = async () => {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) throw new Error('GITHUB_TOKEN is required')

  const everhourApiKey = process.env.EVERHOUR_API_KEY
  if (!everhourApiKey) throw new Error('EVERHOUR_API_KEY is required')

  const everhourProjectId = process.env.EVERHOUR_PROJECT_ID
  if (!everhourProjectId) throw new Error('EVERHOUR_PROJECT_ID is required')

  const limit = parseInt(process.env.LIMIT ?? '10', 10)
  const dryRunAI = process.env.DRY_RUN_AI === 'true' || process.env.DRY_RUN === 'true'
  const dryRunEverhour = process.env.DRY_RUN_EVERHOUR === 'true' || process.env.DRY_RUN === 'true'

  const repo = process.env.GITHUB_REPOSITORY ?? 'cybersemics/em'
  const [owner, repoName] = repo.split('/')
  const repoRoot = process.env.GITHUB_WORKSPACE ?? process.cwd()

  console.info(
    `Backfill config: limit=${limit}, dryRunAI=${dryRunAI}, dryRunEverhour=${dryRunEverhour}, project=${everhourProjectId}`,
  )

  // 1. Confirm the project exists on Everhour before doing any work, so a bad
  //    EVERHOUR_PROJECT_ID fails fast with a clear message instead of a bare 404.
  const everhour = new EverhourClient({ apiKey: everhourApiKey })
  const project = await everhour.getProject(everhourProjectId).catch(() => null)
  if (!project) {
    throw new Error(`Everhour project "${everhourProjectId}" not found. Check EVERHOUR_PROJECT_ID.`)
  }
  console.info(`Found Everhour project: "${project.name}" (${project.id})`)

  // 2. Fetch tasks from the Everhour project
  const tasks = await everhour.getProjectTasks(everhourProjectId)
  console.info(`Found ${tasks.length} tasks in Everhour project`)

  // 3. Filter to tasks without estimates
  const tasksWithoutEstimates = tasks.filter(task => !task.estimate || !task.estimate.total)
  console.info(`Found ${tasksWithoutEstimates.length} tasks without estimates`)

  // 4. Extract issue numbers and fetch GitHub issues
  const instructions = loadInstructions(repoRoot)
  const samples = loadSamples(repoRoot)
  const promptVersion = getPromptVersion(repoRoot)

  let processed = 0

  for (const task of tasksWithoutEstimates) {
    if (processed >= limit) break

    // Try to extract the issue number from the task ID or name; fall back to GitHub title search
    let issueNumber = extractIssueNumber(task)
    if (issueNumber === null) {
      issueNumber = await findIssueByTitle(task.name, owner, repoName, githubToken)
    }
    if (issueNumber === null) {
      console.info(`  Skipping task "${task.name}" (${task.id}) - no GitHub issue number found`)
      continue
    }

    // Fetch the GitHub issue
    const issueResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${issueNumber}`, {
      headers: { Authorization: `Bearer ${githubToken}` },
    })

    if (!issueResp.ok) {
      console.info(`  Skipping issue #${issueNumber} - GitHub API error ${issueResp.status}`)
      continue
    }

    const issue: GitHubIssue = (await issueResp.json()) as GitHubIssue

    if (!issue.body) {
      console.info(`  Skipping issue #${issueNumber} - empty body`)
      continue
    }

    await processTask({
      issue,
      taskId: task.id,
      everhour,
      githubToken,
      owner,
      repoName,
      instructions,
      samples,
      promptVersion,
      dryRunAI,
      dryRunEverhour,
    })
    processed++
  }

  console.info(`\nBackfill complete. Processed ${processed} tasks.`)
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
