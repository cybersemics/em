#!/usr/bin/env node
/**
 * Starts a GitHub Copilot cloud agent session against a Dependabot pull request whose checks
 * failed, then records it in a single comment on that pull request.
 * Used by the `Start Opus 5 session` step of .github/workflows/dependabot-fix.yml.
 *
 * ```sh
 * node scripts/ci/start-dependabot-fix-task.mjs <report.json>
 * ```
 *
 * The report is written by scripts/ci/collect-dependabot-failures.cjs, which has already decided
 * that a session is warranted — every guard against starting a duplicate one lives there, so this
 * dispatches whatever it is handed.
 *
 * The session commits to the pull request's own branch rather than opening a second pull request:
 * the agent tasks API resolves `head_ref` + `base_ref` to the open pull request between them and
 * pushes there. Note that a push by anyone other than Dependabot makes Dependabot stop rebasing the
 * branch, which is the intended outcome — from that point the fix and the bump travel together.
 *
 * Requires COPILOT_TASKS_TOKEN, a user-to-server token — a fine-grained personal access token with
 * the "Agent tasks" repository permission set to read and write, belonging to someone with a
 * Copilot plan that includes the cloud agent. The endpoint rejects the workflow's own GITHUB_TOKEN,
 * which is an app installation token. Without the secret this reports the omission and does
 * nothing, matching how puppeteer-flaky.yml treats the same secret. GH_TOKEN is the workflow's
 * ordinary token, used only for the comment.
 *
 * Writes a markdown summary of what was dispatched to stdout; diagnostics go to stderr. Exits
 * non-zero when the dispatch fails, leaving no comment behind so a re-run can try again, and also
 * when only the comment fails — the session is running either way, but the comment is what stops
 * the next check completion from starting a second one.
 */
import { readFileSync } from 'node:fs'

/**
 * A dependency bump that broke a check is read-the-changelog work across an unfamiliar package, so
 * these sessions pin the strongest model rather than leaving Copilot to auto-select one. Same
 * reasoning, and the same model, as scripts/ci/start-copilot-tasks.mjs.
 */
const MODEL = 'claude-opus-5'

/** How that model is named to a human, as opposed to MODEL, which is what the API expects. */
const MODEL_NAME = 'Opus 5'

/** The repository's general-purpose coding agent, `.github/agents/worker-bee.agent.md`. */
const CUSTOM_AGENT = 'worker-bee'

/** The API version the agent tasks endpoints are documented under. */
const API_VERSION = '2026-03-10'

/**
 * Marker identifying the single session comment this workflow maintains on a pull request. Must
 * match the one in scripts/ci/collect-dependabot-failures.cjs, which reads it to dedupe.
 */
const MARKER = '<!-- dependabot-fix -->'

const [reportFile] = process.argv.slice(2)
if (!reportFile) {
  console.error('usage: node scripts/ci/start-dependabot-fix-task.mjs <report.json>')
  process.exit(2)
}

const token = process.env.COPILOT_TASKS_TOKEN
if (!token) {
  console.error('COPILOT_TASKS_TOKEN secret not set; skipping Copilot session dispatch.')
  process.exit(0)
}

const { pr, failures, sessions, maxSessions, commentId, runUrl } = JSON.parse(readFileSync(reportFile, 'utf8'))

/** Which attempt this is. The cap itself lives in collect-dependabot-failures.cjs, which enforces it. */
const attempt = sessions + 1

/** One line per failing check, naming the workflow it belongs to when that is not obvious. */
const failureLine = failure => {
  const workflow = failure.workflow && failure.workflow !== failure.name ? ` (${failure.workflow})` : ''
  const onBase = failure.alsoFailingOnBase ? ' — also failing on the base branch, so probably not the bump' : ''
  return `- **${failure.name}**${workflow}: ${failure.url}${onBase}`
}

/** A collapsed block of the failing job's log, for the checks an excerpt could be read from. */
const failureLog = failure =>
  [
    `<details><summary>${failure.name} — end of the job log</summary>`,
    '',
    '```',
    failure.excerpt,
    '```',
    '',
    '</details>',
  ].join('\n')

/** The prompt the session starts from: which checks failed, what they said, and how to treat them. */
const prompt = [
  `The Dependabot pull request #${pr.number} (${pr.url}) — ${pr.title} — has failing checks. Fix them on its branch \`${pr.headRef}\` so the bump can merge. Commit there; do not open a second pull request.`,
  '',
  'Failing checks:',
  '',
  ...failures.map(failureLine),
  '',
  ...failures.filter(failure => failure.excerpt).map(failureLog),
  '',
  "The upgrade is the change under test, so fix this repository against the new version: read the dependency's changelog between the two versions and adapt the code to what it changed. Reverting the bump, pinning the old version, loosening an assertion, and relaxing a lint rule are all ways of not doing the upgrade — take one only if the new version is genuinely incompatible with this codebase, and say so on the pull request when you do.",
  '',
  'Reproduce before theorising: run the failing suite rather than reading the log and guessing. `docs/testing.md` describes how each suite runs, and which failures are known to be flaky rather than real.',
  '',
  'If a check turns out to be failing for a reason unrelated to the dependency, leave it alone and say so on the pull request instead of fixing an unrelated bug here.',
].join('\n')

/** Starts the Copilot cloud agent session on the pull request's branch, and returns it. */
const startSession = async () => {
  const response = await fetch(`https://api.github.com/agents/repos/${process.env.GITHUB_REPOSITORY}/tasks`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-github-api-version': API_VERSION,
    },
    body: JSON.stringify({
      prompt,
      model: MODEL,
      custom_agent: CUSTOM_AGENT,
      // head_ref + base_ref resolves to the open pull request between them, so the agent commits to
      // the Dependabot branch instead of branching off it.
      head_ref: pr.headRef,
      base_ref: pr.baseRef,
    }),
  })
  // The error body is JSON pretty-printed over several lines; flatten it so it stays on one line
  // of the summary.
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, ' ').trim()
    throw new Error(`${response.status} ${response.statusText} — ${detail.slice(0, 300)}`)
  }
  return response.json()
}

/**
 * Creates or updates the single marked session comment on the pull request. It carries the head
 * SHA and the number of sessions so far, which is what collect-dependabot-failures.cjs reads to
 * tell a session it already started from one it has not, and to know when to stop.
 */
const comment = async sessionUrl => {
  const body = [
    MARKER,
    `<!-- head: ${pr.headSha} -->`,
    `<!-- sessions: ${attempt} -->`,
    `### 🤖 ${MODEL_NAME} session started`,
    '',
    `${failures.length === 1 ? 'A check' : `${failures.length} checks`} failed on \`${pr.headSha.slice(0, 7)}\`, so an agent session is fixing ${failures.length === 1 ? 'it' : 'them'} on this branch: [session](${sessionUrl}).`,
    '',
    ...failures.map(failureLine),
    '',
    `Attempt ${attempt} of ${maxSessions}.${
      attempt >= maxSessions
        ? ` No further session starts on its own after this one — if it needs another, run \`gh workflow run dependabot-fix.yml -f pr=${pr.number}\`.`
        : ''
    } Started by [Dependabot Fix](${runUrl}).`,
  ].join('\n')

  const base = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}`
  const response = await fetch(
    commentId ? `${base}/issues/comments/${commentId}` : `${base}/issues/${pr.number}/comments`,
    {
      method: commentId ? 'PATCH' : 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${process.env.GH_TOKEN}`,
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ body }),
    },
  )
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
}

const session = await startSession()
console.error(`Started ${MODEL} session for #${pr.number}: ${session.html_url}`)

process.stdout.write(
  [
    '## Dependabot fix session',
    '',
    `- [#${pr.number}](${pr.url}) \`${pr.headRef}\` — [${MODEL_NAME} session](${session.html_url}) (attempt ${attempt} of ${maxSessions})`,
    ...failures.map(failureLine),
    '',
  ].join('\n'),
)

// Last, so a failed dispatch leaves no comment claiming a session exists, and a failed comment
// still reports the session that did start. The comment is the dedupe record, so losing it is
// worth a red step even though the session itself is running fine.
try {
  await comment(session.html_url)
} catch (e) {
  console.error(`Started the session, but could not comment on #${pr.number}: ${e.message}`)
  process.exit(1)
}
