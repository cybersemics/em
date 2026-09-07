#!/usr/bin/env node
/**
 * Starts Copilot sessions for due conflicting Copilot pull requests and records successful starts.
 * It re-checks the PR immediately before dispatch so a stale scanner cannot start unnecessary work.
 * The comment it records them in is rendered by scripts/ci/copilot-conflicts-comment.cjs, which the
 * scan rewrites from the same state — see that file for why neither side renders its own.
 */
import { readFileSync } from 'node:fs'
import { MARKER, MAX_ATTEMPTS, commentBody, parseState } from './copilot-conflicts-comment.cjs'

const SKIP_LABEL = 'skip-auto-resolve-conflicts'
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
  // The label can be applied between the scan and this dispatch, so it is re-checked here too.
  if ((pr.labels || []).some(label => label.name === SKIP_LABEL)) {
    return `- [#${task.number}](${task.url}) — skipped by the \`${SKIP_LABEL}\` label.`
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
    // Recorded rather than derived, so a later scan rewriting this comment still credits the run
    // that started the attempt instead of itself.
    lastRunUrl: process.env.RUN_URL || null,
    history: [...state.history, { startedAt: new Date().toISOString(), taskUrl: session.html_url }],
  }
  const update = await fetch(`${base}/issues/comments/${comment.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ body: commentBody({ state: updated, number: task.number }) }),
  })
  if (!update.ok)
    throw new Error(`task started but could not update #${task.number}: ${update.status} ${update.statusText}`)
  return `- [#${task.number}](${task.url}) — [Copilot task](${session.html_url}) started (attempt ${updated.attempts} of ${MAX_ATTEMPTS}).`
}

const results = await Promise.allSettled(tasks.map(dispatchTask))
const lines = results.map((result, index) =>
  result.status === 'fulfilled'
    ? result.value
    : `- [#${tasks[index].number}](${tasks[index].url}) — dispatch failed: ${result.reason.message}`,
)
process.stdout.write(['## Copilot conflict-resolution tasks', '', ...lines, ''].join('\n'))
if (results.some(result => result.status === 'rejected')) process.exit(1)
