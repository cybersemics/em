/**
 * Handles /estimate Nh comments on GitHub issues.
 * Triggered by: .github/workflows/estimate-command.yml
 *
 * On a trusted /estimate command, immediately updates the Everhour estimate for the linked
 * GitHub issue and opens a PR to commit the corrected sample to the training corpus.
 */
import 'dotenv/config'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import EverhourClient from './everhour/client.ts'
import { type EstimateCategory, HOURS_TO_CATEGORY, VALID_HOURS, categoryToSeconds } from './everhour/estimates.ts'
import issueLink from './lib/issueLink.ts'
import issueUrlSuffix from './lib/issueUrlSuffix.ts'

const TRUSTED_ASSOCIATIONS = ['OWNER', 'MEMBER', 'COLLABORATOR']

interface CommentEvent {
  action: string
  comment: {
    id: number
    body: string
    author_association: string
    user: { login: string }
  }
  issue: {
    number: number
    title: string
    body: string | null
    labels: Array<{ name: string }>
  }
}

/** Parses /estimate command from comment body. Returns hours or null. The suffix "h" is optional. */
const parseEstimateCommand = (body: string): number | null => {
  const match = body.trim().match(/^\/estimate\s+(\d+)h?\s*$/)
  if (!match) return null
  return parseInt(match[1], 10)
}

/** Rounds an arbitrary hour value to the nearest valid estimate category. */
const roundToNearestCategory = (hours: number): (typeof VALID_HOURS)[number] => {
  return VALID_HOURS.reduce((nearest, candidate) =>
    Math.abs(candidate - hours) < Math.abs(nearest - hours) ? candidate : nearest,
  )
}

/** Generates a deterministic sample filename for an issue. */
const sampleFilename = (issueNumber: number): string => `issue-${issueNumber}.json`

const main = async () => {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) throw new Error('GITHUB_TOKEN is required')

  const everhourApiKey = process.env.EVERHOUR_API_KEY
  if (!everhourApiKey) throw new Error('EVERHOUR_API_KEY is required')

  const everhourProjectId = process.env.EVERHOUR_PROJECT_ID
  if (!everhourProjectId) throw new Error('EVERHOUR_PROJECT_ID is required')

  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required')

  const repo = process.env.GITHUB_REPOSITORY ?? ''
  const [owner, repoName] = repo.split('/')

  const eventPayload: CommentEvent = JSON.parse(fs.readFileSync(eventPath, 'utf-8'))
  const { comment, issue } = eventPayload

  // Parse command
  const hours = parseEstimateCommand(comment.body)
  if (hours === null) return // Not an estimate command

  // Check trusted commenter
  if (!TRUSTED_ASSOCIATIONS.includes(comment.author_association)) {
    await postComment(
      githubToken,
      owner,
      repoName,
      issue.number,
      'Only repository owners, members, and collaborators can submit estimate corrections.',
    )
    return
  }

  // Round to nearest valid category (e.g. 10h → 8h/M, 3h → 4h/S)
  const roundedHours = roundToNearestCategory(hours)
  const category = HOURS_TO_CATEGORY[roundedHours] as EstimateCategory
  const seconds = categoryToSeconds(category)

  // Update Everhour immediately. Everhour task IDs for GitHub-linked tasks embed the issue's internal
  // database ID (gh:<issue_database_id>), not the issue number, so the task must be looked up rather
  // than synthesized.
  const everhour = new EverhourClient({ apiKey: everhourApiKey })
  const task = await everhour.findTaskByIssueNumber(everhourProjectId, issue.number)
  if (!task) {
    await postComment(
      githubToken,
      owner,
      repoName,
      issue.number,
      'Could not find a matching Everhour task for this issue, so the estimate was not updated.',
    )
    return
  }
  await everhour.setEstimate(task.id, seconds)

  // Create sample file content
  const sample = {
    input: {
      title: issue.title,
      body: issue.body ?? '',
      labels: issue.labels.map(l => l.name),
    },
    expected: category,
    source: {
      type: 'manual-estimate-comment',
      issue: issue.number,
      comment: comment.id,
      hours: roundedHours,
    },
  }

  const samplePath = `.github/instructions/estimate/samples/${sampleFilename(issue.number)}`
  const sampleContent = JSON.stringify(sample, null, 2) + '\n'
  const branchName = `estimate-sample/issue-${issue.number}`

  // Create branch and PR via GitHub API
  const repoResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
    headers: { Authorization: `Bearer ${githubToken}` },
  })
  const repoData = (await repoResp.json()) as { default_branch: string }
  const defaultBranch = repoData.default_branch

  const refResp = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`, {
    headers: { Authorization: `Bearer ${githubToken}` },
  })
  const refData = (await refResp.json()) as { object: { sha: string } }
  const baseSha = refData.object.sha

  // Create branch
  await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
  })

  // Create or update file
  const existingFileResp = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/contents/${samplePath}?ref=${branchName}`,
    { headers: { Authorization: `Bearer ${githubToken}` } },
  )
  const existingFile = existingFileResp.ok ? ((await existingFileResp.json()) as { sha: string }) : null

  const filePayload: Record<string, string> = {
    message: `Add estimate sample for issue #${issue.number}`,
    content: Buffer.from(sampleContent).toString('base64'),
    branch: branchName,
  }
  if (existingFile?.sha) {
    filePayload.sha = existingFile.sha
  }

  await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${samplePath}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(filePayload),
  })

  // Open PR
  const prBody = `Adds a corrected estimate sample from \`/estimate ${roundedHours}h\`.\n\nIssue: ${owner}/${repoName}#${issue.number}\nExpected estimate: ${category} / ${roundedHours}h`
  await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${githubToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `Add estimate sample for issue ${owner}/${repoName}#${issue.number}`,
      body: prBody,
      head: branchName,
      base: defaultBranch,
    }),
  })

  // Confirm via comment
  await postComment(
    githubToken,
    owner,
    repoName,
    issue.number,
    `Estimate updated: ${category} / ${roundedHours}h\nA PR has been opened to add the corrected sample.`,
  )

  console.info(
    `Manual correction applied for issue ${issueLink(owner, repoName, issue.number)} @ ${category} / ${roundedHours}h${issueUrlSuffix(owner, repoName, issue.number)}`,
  )
}

/** Posts a comment on a GitHub issue. */
const postComment = async (token: string, owner: string, repo: string, issueNumber: number, body: string) => {
  await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    // Set exitCode instead of calling process.exit(1): process.exit() terminates before Node drains
    // its async stdout/stderr writes, which silently truncates buffered log output (including this
    // error) when the streams are pipes, as in CI. Setting exitCode lets the process exit naturally.
    process.exitCode = 1
  })
}

export { parseEstimateCommand, roundToNearestCategory, sampleFilename, TRUSTED_ASSOCIATIONS }
