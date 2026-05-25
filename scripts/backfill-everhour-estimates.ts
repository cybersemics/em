import { execSync } from 'child_process'
import * as path from 'path'
import buildPrompt from '../src/estimation/buildPrompt'
import callGitHubModel from '../src/estimation/callGitHubModel'
import loadInstructions from '../src/estimation/loadInstructions'
import loadSamples from '../src/estimation/loadSamples'
import validateEstimate from '../src/estimation/validateEstimate'
import EverhourClient from '../src/everhour/client'
import { CATEGORY_TO_HOURS, EstimateCategory, categoryToSeconds } from '../src/everhour/estimates'
import { EverhourTask } from '../src/everhour/types'

/** Extracts GitHub issue number from an Everhour task ID (format: gh:REPO_ID:ISSUE_NUMBER or similar). */
const extractIssueNumber = (task: EverhourTask): number | null => {
  // Everhour GitHub tasks typically have IDs like "gh:REPO_ID:ISSUE_NUMBER"
  const parts = task.id.split(':')
  if (parts.length >= 3) {
    const num = parseInt(parts[parts.length - 1], 10)
    return isNaN(num) ? null : num
  }
  // Also try to match from task name like "#123 Issue title"
  const match = task.name.match(/^#(\d+)\s/)
  return match ? parseInt(match[1], 10) : null
}

/** Gets the prompt version. */
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

const main = async () => {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) throw new Error('GITHUB_TOKEN is required')

  const everhourApiKey = process.env.EVERHOUR_API_KEY
  if (!everhourApiKey) throw new Error('EVERHOUR_API_KEY is required')

  const everhourProjectId = process.env.EVERHOUR_PROJECT_ID
  if (!everhourProjectId) throw new Error('EVERHOUR_PROJECT_ID is required')

  const limit = parseInt(process.env.LIMIT ?? '10', 10)
  const dryRun = process.env.DRY_RUN !== 'false'

  const repo = process.env.GITHUB_REPOSITORY ?? 'cybersemics/em'
  const [owner, repoName] = repo.split('/')
  const repoRoot = process.env.GITHUB_WORKSPACE ?? process.cwd()

  console.info(`Backfill config: limit=${limit}, dryRun=${dryRun}, project=${everhourProjectId}`)

  // 1. Fetch tasks from Everhour project
  const everhour = new EverhourClient({ apiKey: everhourApiKey })
  const tasks = await everhour.getProjectTasks(everhourProjectId)
  console.info(`Found ${tasks.length} tasks in Everhour project`)

  // 2. Filter to tasks without estimates
  const tasksWithoutEstimates = tasks.filter(task => !task.estimate || !task.estimate.total)
  console.info(`Found ${tasksWithoutEstimates.length} tasks without estimates`)

  // 3. Extract issue numbers and fetch GitHub issues
  const instructions = loadInstructions(repoRoot)
  const samples = loadSamples(repoRoot)
  const promptVersion = getPromptVersion(repoRoot)

  let processed = 0

  for (const task of tasksWithoutEstimates) {
    if (processed >= limit) break

    const issueNumber = extractIssueNumber(task)
    if (issueNumber === null) {
      console.info(`  Skipping task "${task.name}" - cannot extract issue number`)
      continue
    }

    // 4. Fetch the GitHub issue
    const issueResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${issueNumber}`, {
      headers: { Authorization: `Bearer ${githubToken}` },
    })

    if (!issueResp.ok) {
      console.info(`  Skipping issue #${issueNumber} - GitHub API error ${issueResp.status}`)
      continue
    }

    const issue: GitHubIssue = (await issueResp.json()) as GitHubIssue

    // 5. Skip empty bodies
    if (!issue.body) {
      console.info(`  Skipping issue #${issueNumber} - empty body`)
      continue
    }

    // 6. Run estimator
    const issueInput = {
      title: issue.title,
      body: issue.body,
      labels: issue.labels.map(l => l.name),
    }
    const prompt = buildPrompt(instructions, samples, issueInput)

    if (dryRun) {
      console.info(`  [DRY RUN] Would estimate issue #${issueNumber}: "${issue.title}"`)
      processed++
      continue
    }

    const outputs = await callGitHubModel({ token: githubToken, prompt })
    const result = validateEstimate(outputs)
    const category = result.estimate as EstimateCategory
    const hours = CATEGORY_TO_HOURS[category]
    const seconds = categoryToSeconds(category)

    // 7. Update Everhour
    await everhour.setEstimate(task.id, seconds)

    // 8. Leave audit comment
    const commentBody = `Everhour estimate: ${category} / ${hours}h\nPrompt version: \`${promptVersion}\`\nSource: manual backlog backfill`
    await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentBody }),
    })

    console.info(`  Estimated issue #${issueNumber}: ${category} / ${hours}h`)
    processed++
  }

  console.info(`\nBackfill complete. Processed ${processed} tasks.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

export { extractIssueNumber }
