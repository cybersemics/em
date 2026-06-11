import { execSync } from 'child_process'
import * as path from 'path'
import buildPrompt from '../src/estimation/buildPrompt'
import callGitHubModel from '../src/estimation/callGitHubModel'
import loadInstructions from '../src/estimation/loadInstructions'
import loadSamples from '../src/estimation/loadSamples'
import validateEstimate from '../src/estimation/validateEstimate'
import EverhourClient from '../src/everhour/client'
import { CATEGORY_TO_HOURS, EstimateCategory, categoryToSeconds } from '../src/everhour/estimates'

interface IssuePayload {
  number: number
  title: string
  body: string | null
  labels: Array<{ name: string }>
}

/** Gets the prompt version (latest commit hash touching the instructions directory). */
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

/** Main entry point for the issue-opened estimation workflow. */
const main = async () => {
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) throw new Error('GITHUB_TOKEN is required')

  const everhourApiKey = process.env.EVERHOUR_API_KEY
  if (!everhourApiKey) throw new Error('EVERHOUR_API_KEY is required')

  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) throw new Error('GITHUB_EVENT_PATH is required')

  const repoRoot = process.env.GITHUB_WORKSPACE ?? process.cwd()
  const eventPayload = JSON.parse(require('fs').readFileSync(eventPath, 'utf-8'))
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

  // Build prompt and call model
  const issueInput = {
    title: issue.title,
    body: issue.body,
    labels: issue.labels.map(l => l.name),
  }
  const prompt = buildPrompt(instructions, samples, issueInput)
  const outputs = await callGitHubModel({ token: githubToken, prompt })

  // Validate
  const result = validateEstimate(outputs)
  const category = result.estimate as EstimateCategory
  const hours = CATEGORY_TO_HOURS[category]
  const seconds = categoryToSeconds(category)

  // Update Everhour
  const everhour = new EverhourClient({ apiKey: everhourApiKey })
  const taskId = `gh:${issue.number}`
  await everhour.setEstimate(taskId, seconds)

  // Get prompt version
  const promptVersion = getPromptVersion(repoRoot)

  // Leave audit comment
  const commentBody = `Everhour estimate: ${category} / ${hours}h\nPrompt version: \`${promptVersion}\`\nConfidence: 80%`

  await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues/${issue.number}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${githubToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: commentBody }),
  })

  console.info(`Estimated issue #${issue.number}: ${category} / ${hours}h`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
