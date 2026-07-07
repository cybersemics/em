/**
 * Backfills Everhour estimates for GitHub issues that have no estimate yet.
 * Run manually: node scripts/estimate/src/backfill.ts
 *
 * Traverses all Everhour project tasks → filters to those missing estimates →
 * fetches the corresponding GitHub issue → runs AI inference → writes the
 * estimate back to Everhour and leaves an audit comment on the GitHub issue.
 */
import { execSync } from 'child_process'
import 'dotenv/config'
import * as path from 'path'
import { fileURLToPath } from 'url'
import EverhourClient from './everhour/client.ts'
import extractIssueNumber from './everhour/extractIssueNumber.ts'
import estimateIssue from './lib/estimateIssue.ts'
import issueLink from './lib/issueLink.ts'
import loadInstructions from './lib/loadInstructions.ts'
import loadSamples from './lib/loadSamples.ts'

/**
 * Gets the short git commit hash of the most recent change to the estimate instructions file.
 * Used to tag AI-generated estimates with the prompt version for auditability.
 */
const getPromptVersion = (repoRoot: string): string => {
  try {
    return execSync('git log -1 --format=%h -- .github/instructions/estimate/estimate.instructions.md', {
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
  state: string
  labels: Array<{ name: string }>
  /** Present (non-null) only when the number actually refers to a pull request. */
  pull_request?: unknown
}

/**
 * Determines whether a GitHub issues-API object (or search result) actually refers to a pull request.
 * PRs and issues share GitHub's number space; the `pull_request` field is the only reliable signal
 * that a given number is a PR rather than an issue.
 */
export const isPullRequest = (item: { pull_request?: unknown }): boolean => item.pull_request != null

/**
 * Searches GitHub for an issue matching the given title exactly.
 * Used as a fallback when the Everhour task ID does not encode the issue number.
 *
 * The `search/issues` endpoint matches pull requests as well as issues, so an exact issue match is
 * preferred over a PR. A PR-only match is still returned so the caller can skip it with an accurate
 * "it is a pull request" reason rather than a misleading "no issue number found".
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
  const data = (await resp.json()) as {
    items: Array<{ number: number; title: string; pull_request?: unknown }>
  }
  const exactMatches = data.items.filter(item => item.title === title)
  const issueMatch = exactMatches.find(item => !isPullRequest(item))
  return (issueMatch ?? exactMatches[0])?.number ?? null
}

/**
 * Runs AI inference on a GitHub issue and writes the resulting estimate to Everhour.
 * Delegates the dry-run guards and the Everhour write to estimateIssue; when dryRunAI is
 * set no inference runs (estimateIssue returns null) and the audit comment is skipped.
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
  const estimate = await estimateIssue({
    issue: {
      title: issue.title,
      body: issue.body!,
      labels: issue.labels.map(l => l.name),
    },
    issueRef: issueLink(owner, repoName, issue.number),
    instructions,
    samples,
    token: githubToken,
    everhour,
    taskId,
    dryRunAI,
    dryRunEverhour,
  })

  // Skip the audit comment when inference was dry-run (no estimate produced).
  if (!estimate) return

  const { category, hours } = estimate

  // Leave audit comment on GitHub issue
  const commentBody = `Everhour estimate: ${category} / ${hours}h\nPrompt version: ${promptVersion}\nSource: backfill`
  await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${issue.number}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: commentBody }),
  })

  console.info(`  Estimated issue ${issueLink(owner, repoName, issue.number)}: ${category} / ${hours}h`)
}

const main = async () => {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) throw new Error('GITHUB_TOKEN is required')

  const everhourApiKey = process.env.EVERHOUR_API_KEY
  if (!everhourApiKey) throw new Error('EVERHOUR_API_KEY is required')

  const everhourProjectId = process.env.EVERHOUR_PROJECT_ID
  if (!everhourProjectId) throw new Error('EVERHOUR_PROJECT_ID is required')

  const limit = parseInt(process.env.LIMIT ?? '10', 10)
  // 1-based page to begin Everhour task pagination from. Floor invalid or <1 values to 1 so a
  // bad PAGE never sends NaN/0 to the API. Combined with LIMIT this processes up to LIMIT tasks
  // starting from page PAGE.
  const startPageRaw = parseInt(process.env.PAGE ?? '1', 10)
  const startPage = Number.isFinite(startPageRaw) && startPageRaw >= 1 ? startPageRaw : 1
  // Dry-run is off by default: the backfill calls the model / writes to Everhour unless
  // explicitly enabled with DRY_RUN[_AI|_EVERHOUR]=true. DRY_RUN sets the default for both
  // stages; the per-stage vars override it.
  const dryRunDefault = process.env.DRY_RUN === 'true'
  const dryRunAI = process.env.DRY_RUN_AI !== undefined ? process.env.DRY_RUN_AI === 'true' : dryRunDefault
  const dryRunEverhour =
    process.env.DRY_RUN_EVERHOUR !== undefined ? process.env.DRY_RUN_EVERHOUR === 'true' : dryRunDefault

  const repo = process.env.GITHUB_REPOSITORY ?? 'cybersemics/em'
  const [owner, repoName] = repo.split('/')
  // Resolve the repo root from this file's location (scripts/estimate/src/backfill.ts → repo root)
  // so instructions/samples load correctly regardless of the current working directory.
  const repoRoot =
    process.env.GITHUB_WORKSPACE ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

  console.info(
    `Backfill config: limit=${limit}, startPage=${startPage}, dryRunAI=${dryRunAI}, dryRunEverhour=${dryRunEverhour}, project=${everhourProjectId}`,
  )

  // 1. Confirm the project exists on Everhour before doing any work, so a bad
  //    EVERHOUR_PROJECT_ID fails fast with a clear message instead of a bare 404.
  const everhour = new EverhourClient({ apiKey: everhourApiKey })
  const project = await everhour.getProject(everhourProjectId).catch(() => null)
  if (!project) {
    throw new Error(`Everhour project "${everhourProjectId}" not found. Check EVERHOUR_PROJECT_ID.`)
  }
  console.info(`Found Everhour project: "${project.name}" (${project.id})`)

  // 2. Extract issue numbers and fetch GitHub issues
  const instructions = loadInstructions(repoRoot)
  const samples = loadSamples(repoRoot)
  const promptVersion = getPromptVersion(repoRoot)

  // 3. Page through the project's tasks, processing one page at a time rather than loading
  //    every task up front. Everhour caps a page at PAGE_SIZE tasks; a shorter page is the
  //    last one. We stop early once `limit` tasks have been processed.
  const PAGE_SIZE = 250
  let processed = 0
  let page = startPage

  while (processed < limit) {
    const tasks = await everhour.getProjectTasks(everhourProjectId, page, PAGE_SIZE)
    console.info(`Fetched ${tasks.length} tasks from Everhour project (page ${page})`)

    // Filter to tasks without estimates within this page.
    const tasksWithoutEstimates = tasks.filter(task => !task.estimate || !task.estimate.total)
    console.info(`  ${tasksWithoutEstimates.length} tasks without estimates on page ${page}`)

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
        console.info(
          `  Skipping issue ${issueLink(owner, repoName, issueNumber)} - GitHub API error ${issueResp.status}`,
        )
        continue
      }

      const issue: GitHubIssue = (await issueResp.json()) as GitHubIssue

      // Some Everhour tasks are linked to pull requests, not issues. GitHub's issues API returns PRs
      // too (they share the number space), so detect and skip them before the closed-state check —
      // otherwise a merged PR would be reported with the misleading "closed" reason.
      if (isPullRequest(issue)) {
        console.info(
          `  Skipping ${issueLink(owner, repoName, issueNumber)} "${issue.title}" - it is a pull request, not an issue`,
        )
        continue
      }

      // Do not estimate closed issues.
      if (issue.state === 'closed') {
        console.info(`  Skipping issue ${issueLink(owner, repoName, issueNumber)} - closed`)
        continue
      }

      if (!issue.body) {
        console.info(`  Skipping issue ${issueLink(owner, repoName, issueNumber)} - empty body`)
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

    // A page shorter than PAGE_SIZE means there are no further pages to fetch.
    if (tasks.length < PAGE_SIZE) break
    page++
  }

  console.info(`\nBackfill complete. Processed ${processed} tasks.`)
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
