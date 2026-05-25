import * as fs from 'fs'
import * as path from 'path'
import EverhourClient from '../src/everhour/client'
import { EstimateCategory, HOURS_TO_CATEGORY, VALID_HOURS, categoryToSeconds } from '../src/everhour/estimates'

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

/** Parses /estimate command from comment body. Returns hours or null. */
const parseEstimateCommand = (body: string): number | null => {
  const match = body.trim().match(/^\/estimate\s+(\d+)h\s*$/)
  if (!match) return null
  return parseInt(match[1], 10)
}

/** Generates a deterministic sample filename for an issue. */
const sampleFilename = (issueNumber: number): string => `issue-${issueNumber}.json`

const main = async () => {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) throw new Error('GITHUB_TOKEN is required')

  const everhourApiKey = process.env.EVERHOUR_API_KEY
  if (!everhourApiKey) throw new Error('EVERHOUR_API_KEY is required')

  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required')

  const repo = process.env.GITHUB_REPOSITORY ?? ''
  const [owner, repoName] = repo.split('/')
  const repoRoot = process.env.GITHUB_WORKSPACE ?? process.cwd()

  const eventPayload: CommentEvent = JSON.parse(fs.readFileSync(eventPath, 'utf-8'))
  const { comment, issue } = eventPayload

  // Parse command
  const hours = parseEstimateCommand(comment.body)
  if (hours === null) return // Not an estimate command

  // Validate hours
  if (!VALID_HOURS.includes(hours as (typeof VALID_HOURS)[number])) {
    const validValues = VALID_HOURS.map(h => `${h}h`).join(', ')
    await postComment(
      githubToken,
      owner,
      repoName,
      issue.number,
      `Invalid estimate value. Valid values are: ${validValues}`,
    )
    return
  }

  // Check trusted commenter
  if (!TRUSTED_ASSOCIATIONS.includes(comment.author_association)) {
    await postComment(
      githubToken,
      owner,
      repoName,
      issue.number,
      `Only repository owners, members, and collaborators can submit estimate corrections.`,
    )
    return
  }

  const category = HOURS_TO_CATEGORY[hours] as EstimateCategory
  const seconds = categoryToSeconds(category)

  // Update Everhour immediately
  const everhour = new EverhourClient({ apiKey: everhourApiKey })
  const taskId = `gh:${issue.number}`
  await everhour.setEstimate(taskId, seconds)

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
      hours,
    },
  }

  const samplePath = `.github/instructions/estimate/samples/${sampleFilename(issue.number)}`
  const sampleContent = JSON.stringify(sample, null, 2) + '\n'
  const branchName = `estimate-sample/issue-${issue.number}`

  // Create branch and PR via GitHub API
  // Get default branch SHA
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
  const prBody = `Adds a corrected estimate sample from \`/estimate ${hours}h\`.\n\nIssue: ${owner}/${repoName}#${issue.number}\nExpected estimate: ${category} / ${hours}h`
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
    `Everhour estimate updated: ${category} / ${hours}h\nA PR has been opened to add the corrected sample.`,
  )

  console.info(`Manual correction applied for issue #${issue.number}: ${category} / ${hours}h`)
}

/** Posts a comment on a GitHub issue. */
const postComment = async (token: string, owner: string, repo: string, issueNumber: number, body: string) => {
  await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})

export { parseEstimateCommand, sampleFilename, TRUSTED_ASSOCIATIONS }
