/**
 * Assigns the best-matching open milestone to a GitHub issue, labels a pure refactor as one, or asks
 * a human when it can do neither.
 *
 * Driven by the .github/workflows/issue-classifier.yml workflow on `issues.opened` and on
 * manual dispatch. Also runs locally against any issue.
 *
 * ```bash
 * node scripts/issue-classifier/src/issue.ts 5092 --dry
 * ```
 */
import 'dotenv/config'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import classifyIssue from './lib/classifyIssue.ts'
import GitHubClient from './lib/github.ts'
import loadInstructions from './lib/loadInstructions.ts'

const DEFAULT_REPO = 'cybersemics/em'

/**
 * Resolves which issue to classify, in order of specificity: an explicit command-line argument, the
 * `ISSUE_NUMBER` input set by a manual workflow dispatch, then the issue that triggered the workflow.
 */
const resolveIssueNumber = (): number => {
  const arg = process.argv.slice(2).find(value => !value.startsWith('--'))
  if (arg != null) {
    const parsed = Number(arg)
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Invalid issue number: ${arg}`)
    return parsed
  }

  if (process.env.ISSUE_NUMBER) {
    const parsed = Number(process.env.ISSUE_NUMBER)
    if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Invalid ISSUE_NUMBER: ${process.env.ISSUE_NUMBER}`)
    return parsed
  }

  const eventPath = process.env.GITHUB_EVENT_PATH
  if (!eventPath) throw new Error('Pass an issue number, or set ISSUE_NUMBER or GITHUB_EVENT_PATH')
  const issueNumber = JSON.parse(fs.readFileSync(eventPath, 'utf-8')).issue?.number
  if (typeof issueNumber !== 'number') throw new Error(`No issue number in the event payload at ${eventPath}`)
  return issueNumber
}

/** Classifies one issue and reports what was done. */
const main = async () => {
  const dryRun = process.argv.includes('--dry')

  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY is required')

  // Reads work unauthenticated against a public repository, so only a run that actually writes
  // needs a token. That is what lets --dry be exercised locally with nothing but an OpenAI key.
  const token = process.env.GITHUB_TOKEN
  if (!token && !dryRun) throw new Error('GITHUB_TOKEN is required (or pass --dry to preview)')

  const repo = process.env.GITHUB_REPOSITORY ?? process.env.ISSUE_CLASSIFIER_REPO ?? DEFAULT_REPO
  const issueNumber = resolveIssueNumber()

  const result = await classifyIssue({
    github: new GitHubClient({ repo, token }),
    issueNumber,
    instructions: loadInstructions(),
    openaiApiKey,
    dryRun,
  })

  const prefix = dryRun ? '[DRY_RUN] Would have ' : ''
  const url = `https://github.com/${repo}/issues/${issueNumber}`
  const summary =
    result.action === 'assigned'
      ? `${prefix}assigned #${issueNumber} to ${result.milestone}${result.refactor ? ' and labeled it refactor' : ''} (${result.detail})`
      : result.action === 'labeled'
        ? `${prefix}labeled #${issueNumber} refactor with no milestone (${result.detail})`
        : result.action === 'asked'
          ? `${prefix}asked for a category on #${issueNumber} (${result.detail})`
          : `Skipped #${issueNumber}: ${result.detail}`
  console.info(`${summary} - ${url}`)

  // A dry run's whole purpose is to show what would happen, and for the ask path what happens is a
  // public comment. Print it so it can be read before it is ever posted.
  if (dryRun && result.question) {
    console.info(`\n--- comment that would be posted ---\n${result.question}\n---`)
  }
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

export default main
