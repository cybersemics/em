#!/usr/bin/env node
/**
 * Starts Copilot sessions for due conflicting Copilot pull requests and records successful starts.
 * It re-checks the PR immediately before dispatch so a stale scanner cannot start unnecessary work.
 */
import { readFileSync } from 'node:fs'

const MARKER = '<!-- copilot-conflicts -->'
const MODEL = 'claude-opus-5'
const CUSTOM_AGENT = 'worker-bee'
const API_VERSION = '2026-03-10'
const [reportFile] = process.argv.slice(2)

if (!reportFile) {
  console.error('usage: node scripts/ci/start-copilot-conflict-task.mjs <report.json>')
  process.exit(2)
}

if (!process.env.COPILOT_TASKS_TOKEN) {
  console.error('COPILOT_TASKS_TOKEN secret not set; skipping Copilot conflict-resolution dispatch.')
  process.exit(0)
}

const { tasks } = JSON.parse(readFileSync(reportFile, 'utf8'))

/** Decodes a state record from the collector's marked comment. */
const parseState = body => {
  const match = /<!-- copilot-conflicts-state: ([A-Za-z0-9_-]+) -->/.exec(body || '')
  if (!match) throw new Error('conflict state comment is missing or malformed')
  const state = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))
  return { ...state, history: Array.isArray(state.history) ? state.history : [] }
}

/** Renders the persisted state in the automation's single visible comment. */
const commentBody = state => {
  const encoded = Buffer.from(JSON.stringify(state)).toString('base64url')
  const nextDelay = [3, 6, 12, 24, 48, 96][state.attempts]
  return [
    MARKER,
    `<!-- copilot-conflicts-state: ${encoded} -->`,
    '### Copilot conflict resolution',
    '',
    state.attempts >= 6
      ? 'Automatic conflict resolution has reached its six-attempt lifetime limit.'
      : `Copilot conflict-resolution task ${state.attempts} of 6 started. The next attempt is eligible after ${nextDelay} hours if this PR still conflicts.`,
    `Latest task: ${state.lastTaskUrl}`,
  ].join('\n')
}

/** Starts a Copilot task on the existing pull request branch. */
const startTask = async task => {
  const response = await fetch(`https://api.github.com/agents/repos/${process.env.GITHUB_REPOSITORY}/tasks`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${process.env.COPILOT_TASKS_TOKEN}`,
      'content-type': 'application/json',
      'x-github-api-version': API_VERSION,
    },
    body: JSON.stringify({
      prompt: [
        `Resolve the merge conflicts on Copilot pull request #${task.number} (${task.url}).`,
        `Merge the latest \`${task.baseRef}\` into \`${task.headRef}\`, preserve both intended changes, and commit the resolution directly to this branch.`,
        'Do not open a second pull request. Run the relevant tests and lint before requesting review.',
      ].join('\n'),
      model: MODEL,
      custom_agent: CUSTOM_AGENT,
      head_ref: task.headRef,
      base_ref: task.baseRef,
    }),
  })
  if (!response.ok)
    throw new Error(
      `${response.status} ${response.statusText} — ${(await response.text()).replace(/\s+/g, ' ').slice(0, 300)}`,
    )
  return response.json()
}

/** Re-reads a PR and records a successful task only if it is still the scanned conflict. */
const dispatchTask = async task => {
  const base = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}`
  const headers = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${process.env.GH_TOKEN}`,
    'content-type': 'application/json',
    'x-github-api-version': '2022-11-28',
  }
  const prResponse = await fetch(`${base}/pulls/${task.number}`, { headers })
  if (!prResponse.ok)
    throw new Error(`could not re-read #${task.number}: ${prResponse.status} ${prResponse.statusText}`)
  const pr = await prResponse.json()
  if (pr.state !== 'open' || pr.mergeable !== false || pr.head.sha !== task.headSha || pr.base.sha !== task.baseSha) {
    return `- [#${task.number}](${task.url}) — skipped because its conflict state changed.`
  }
  const commentsResponse = await fetch(`${base}/issues/${task.number}/comments`, { headers })
  if (!commentsResponse.ok)
    throw new Error(
      `could not read #${task.number} comments: ${commentsResponse.status} ${commentsResponse.statusText}`,
    )
  const comments = await commentsResponse.json()
  const comment = comments.find(candidate => candidate.body && candidate.body.includes(MARKER))
  if (!comment) throw new Error(`#${task.number} no longer has a conflict state comment`)

  const session = await startTask(task)
  const state = parseState(comment.body)
  const updated = {
    ...state,
    attempts: state.attempts + 1,
    lastDispatchedAt: new Date().toISOString(),
    lastTaskUrl: session.html_url,
    history: [...state.history, { startedAt: new Date().toISOString(), taskUrl: session.html_url }],
  }
  const update = await fetch(`${base}/issues/comments/${comment.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ body: commentBody(updated) }),
  })
  if (!update.ok)
    throw new Error(`task started but could not update #${task.number}: ${update.status} ${update.statusText}`)
  return `- [#${task.number}](${task.url}) — [Copilot task](${session.html_url}) started (attempt ${updated.attempts} of 6).`
}

const results = await Promise.allSettled(tasks.map(dispatchTask))
const lines = results.map((result, index) =>
  result.status === 'fulfilled'
    ? result.value
    : `- [#${tasks[index].number}](${tasks[index].url}) — dispatch failed: ${result.reason.message}`,
)
process.stdout.write(['## Copilot conflict-resolution tasks', '', ...lines, ''].join('\n'))
if (results.some(result => result.status === 'rejected')) process.exit(1)
