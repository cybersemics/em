#!/usr/bin/env node
/**
 * Starts a GitHub Copilot cloud agent task for each tracking issue the `File tracking issues` step
 * just filed, so a new flake already has an agent working on it by the time anyone reads the alert.
 * Used by the `Start Copilot tasks` step of .github/workflows/puppeteer-flaky.yml.
 *
 * ```sh
 * node scripts/ci/start-copilot-tasks.mjs <flaky-issues.json>
 * ```
 *
 * Only entries this run created are dispatched, because starting a fresh session against the same
 * flake every night would pile up duplicate branches on it. Nothing here picks up an issue filed by
 * hand, or one filed before this existed — those are assigned by hand.
 *
 * Requires COPILOT_TASKS_TOKEN, a user-to-server token — a fine-grained personal access token with
 * the "Agent tasks" repository permission set to read and write, belonging to someone with a
 * Copilot plan that includes the cloud agent. The endpoint rejects the workflow's own GITHUB_TOKEN,
 * which is an app installation token. Without the secret this reports the omission and does
 * nothing, matching how the Discord step treats its webhook.
 *
 * Writes a markdown summary of what was dispatched to stdout; diagnostics go to stderr. Exits
 * non-zero when a dispatch fails, which marks the step red without failing the job.
 */
import { existsSync, readFileSync } from 'node:fs'

/**
 * Diagnosing a race that surfaces once in fifteen runs is the hardest work in this repository, so
 * these tasks pin the strongest model rather than leaving Copilot to auto-select one.
 */
const MODEL = 'claude-opus-5'

/** The repository's general-purpose coding agent, `.github/agents/worker-bee.agent.md`. */
const CUSTOM_AGENT = 'worker-bee'

/**
 * Cap on tasks started per run. A nightly run normally turns up one or two new flakes; a run that
 * files more than this is usually reporting something systemic, which someone should read before
 * three more agents open pull requests against it. Overflow is named in the summary and left to be
 * assigned by hand — dedupe stops a later run from re-filing those issues, so nothing else will
 * pick them up.
 */
const MAX_TASKS = 3

/** The API version the agent tasks endpoints are documented under. */
const API_VERSION = '2026-03-10'

const [issuesFile] = process.argv.slice(2)
if (!issuesFile) {
  console.error('usage: node scripts/ci/start-copilot-tasks.mjs <flaky-issues.json>')
  process.exit(2)
}

const token = process.env.COPILOT_TASKS_TOKEN
if (!token) {
  console.error('COPILOT_TASKS_TOKEN secret not set; skipping Copilot task dispatch.')
  process.exit(0)
}

// Written only when the issue-filing step got far enough to resolve a tracking issue; absent when
// it failed outright, which its own step already reports.
const issues = existsSync(issuesFile) ? JSON.parse(readFileSync(issuesFile, 'utf8')) : []
const filed = issues.filter(issue => issue.created)
if (filed.length === 0) {
  console.error('No newly filed issues; skipping Copilot task dispatch.')
  process.exit(0)
}

/** The prompt a task starts from: which test is flaky, and how this project expects a flake to be fixed. */
const prompt = issue =>
  [
    `Fix the flaky Puppeteer test tracked by issue #${issue.number} (${issue.url}). Read that issue first — it records how many iterations failed and the error from the first failure.`,
    '',
    `- **File**: \`${issue.file}\``,
    `- **Test**: ${issue.fullName}`,
    '',
    'The test passes most of the time, so treat it as deterministic behaviour whose controlling condition is not known yet. Reproduce before theorising: run this one test repeatedly with the `run-test` skill until you have seen it fail, and read `docs/testing.md` for how this project synchronises Puppeteer tests.',
    '',
    'Do not make it pass with a sleep, a retry, or a longer timeout — that hides the condition instead of removing it. Wait on the state the test actually needs, adding a waiter helper if none exists, and fix the application rather than the test where the race is in the application.',
  ].join('\n')

/** Starts one Copilot cloud agent task against the branch this run tested, and returns it. */
const startTask = async issue => {
  const response = await fetch(`https://api.github.com/agents/repos/${process.env.GITHUB_REPOSITORY}/tasks`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': API_VERSION,
    },
    body: JSON.stringify({
      prompt: prompt(issue),
      model: MODEL,
      custom_agent: CUSTOM_AGENT,
      create_pull_request: true,
      base_ref: process.env.GITHUB_REF_NAME,
    }),
  })
  // The error body is JSON pretty-printed over several lines; flatten it so it stays on one line
  // of the summary's bullet list.
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, ' ').trim()
    throw new Error(`${response.status} ${response.statusText} — ${detail.slice(0, 300)}`)
  }
  return response.json()
}

const dispatched = filed.slice(0, MAX_TASKS)
const overflow = filed.slice(MAX_TASKS)
// allSettled rather than all: one rejected dispatch must not cancel the report of the others.
const results = await Promise.allSettled(dispatched.map(startTask))

const lines = results.map((result, i) => {
  const issue = dispatched[i]
  if (result.status === 'rejected') {
    console.error(`Failed to start a task for #${issue.number}: ${result.reason.message}`)
    return `- [#${issue.number}](${issue.url}) — **dispatch failed**: ${result.reason.message}`
  }
  console.error(`Started ${MODEL} task for #${issue.number}: ${result.value.html_url}`)
  return `- [#${issue.number}](${issue.url}) \`${issue.file}\` — [Copilot task](${result.value.html_url})`
})

if (overflow.length > 0) {
  const numbers = overflow.map(issue => `#${issue.number}`).join(', ')
  console.error(`Task cap (${MAX_TASKS}) reached; no task started for: ${numbers}`)
  lines.push(`- Not dispatched (cap ${MAX_TASKS}): ${numbers} — assign Copilot by hand if they need it.`)
}

process.stdout.write(['## Copilot tasks', '', ...lines, ''].join('\n'))

if (results.some(result => result.status === 'rejected')) process.exit(1)
