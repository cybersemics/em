/**
 * Estimates a newly opened GitHub issue and writes the result to Everhour.
 * Triggered by: .github/workflows/estimate-issue-opened.yml
 */
import 'dotenv/config'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import EverhourClient from './everhour/client.ts'
import estimateIssue from './lib/estimateIssue.ts'
import getPromptVersion from './lib/getPromptVersion.ts'
import issueLink from './lib/issueLink.ts'
import loadInstructions from './lib/loadInstructions.ts'
import loadSamples from './lib/loadSamples.ts'
import promptVersionLink from './lib/promptVersionLink.ts'

interface IssuePayload {
  number: number
  title: string
  body: string | null
  labels: Array<{ name: string }>
}

/** Main entry point for the issue-opened estimation workflow. */
const main = async () => {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) throw new Error('GITHUB_TOKEN is required')

  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY is required')

  const everhourApiKey = process.env.EVERHOUR_API_KEY
  if (!everhourApiKey) throw new Error('EVERHOUR_API_KEY is required')

  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required')

  const repoRoot = process.env.GITHUB_WORKSPACE ?? process.cwd()
  const eventPayload = JSON.parse(fs.readFileSync(eventPath, 'utf-8'))
  const issue: IssuePayload = eventPayload.issue

  if (!issue.body) {
    console.info('Issue body is empty, skipping estimation.')
    return
  }

  const repo = process.env.GITHUB_REPOSITORY ?? ''
  const [owner, repoName] = repo.split('/')

  // Load instructions and samples
  const instructions = loadInstructions(repoRoot)
  const samples = loadSamples(repoRoot)

  // Build prompt, run inference, and write the estimate to Everhour
  const issueInput = {
    title: issue.title,
    body: issue.body,
    labels: issue.labels.map(l => l.name),
  }
  const everhour = new EverhourClient({ apiKey: everhourApiKey })
  const taskId = `gh:${issue.number}`
  const estimate = await estimateIssue({
    issue: issueInput,
    issueRef: issueLink(owner, repoName, issue.number),
    instructions,
    samples,
    openaiApiKey,
    everhour,
    taskId,
  })
  if (!estimate) return
  const { category, hours } = estimate

  // Get prompt version
  const promptVersion = getPromptVersion(repoRoot)

  // Leave audit comment
  const commentBody = `Everhour estimate: ${category} / ${hours}h\nPrompt version: ${promptVersionLink(owner, repoName, promptVersion)}`

  await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${issue.number}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: commentBody }),
  })

  console.info(`Estimated issue ${issueLink(owner, repoName, issue.number)}: ${category} / ${hours}h`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
