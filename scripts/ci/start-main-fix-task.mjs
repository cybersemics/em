#!/usr/bin/env node
/**
 * Starts a GitHub Copilot cloud agent task to fix CI failing on `main`, then links it from the
 * tracking issue. Used by the `Start Copilot task` step of .github/workflows/main-fix.yml.
 *
 * ```sh
 * node scripts/ci/start-main-fix-task.mjs <report.json>
 * ```
 *
 * The report is written by scripts/ci/collect-main-failures.cjs, which has already decided that a
 * task is warranted — the re-run, the grouping, and the one-issue-at-a-time dedupe all live there,
 * so this dispatches whatever it is handed.
 *
 * The task opens its own pull request against `main`. Nothing here merges it: pr-ready.yml does,
 * once the agent has finished and every check on the pull request has completed and passed — see
 * scripts/ci/merge-main-fix.cjs. The prompt says so, because it changes what the agent may leave on
 * the branch.
 *
 * Requires COPILOT_TASKS_TOKEN, the same personal access token the other task-starting workflows
 * use; the endpoint rejects the workflow's own GITHUB_TOKEN. Without the secret this reports the
 * omission and does nothing. GH_TOKEN is the workflow's ordinary token, used only to comment on the
 * issue.
 *
 * Writes a markdown summary to stdout; diagnostics go to stderr. Exits non-zero when the dispatch
 * fails, and when only the comment fails — the task is running either way, but the comment is how
 * a reader of the issue finds it.
 */
import { readFileSync } from 'node:fs'

/**
 * Finding which commit broke `main` and deciding whether to fix or revert it is diagnosis across
 * someone else's change, so these tasks pin the strongest model rather than leaving Copilot to
 * auto-select one — the COPILOT_MODEL repository variable, unless COPILOT_MODEL_MAIN gives these
 * tasks their own. Either holds the ID the agent tasks API expects, e.g. `claude-opus-5.5`.
 */
const MODEL = process.env.COPILOT_MODEL_MAIN || process.env.COPILOT_MODEL

/** The repository's general-purpose coding agent, `.github/agents/worker-bee.agent.md`. */
const CUSTOM_AGENT = 'worker-bee'

/** The API version the agent tasks endpoints are documented under. */
const API_VERSION = '2026-03-10'

const [reportFile] = process.argv.slice(2)
if (!reportFile) {
  console.error('usage: node scripts/ci/start-main-fix-task.mjs <report.json>')
  process.exit(2)
}

const token = process.env.COPILOT_TASKS_TOKEN
if (!token) {
  console.error('COPILOT_TASKS_TOKEN secret not set; skipping Copilot task dispatch.')
  process.exit(0)
}

if (!MODEL) {
  console.error('Neither COPILOT_MODEL_MAIN nor COPILOT_MODEL is set; set the COPILOT_MODEL repository variable.')
  process.exit(1)
}

const { sha, title, issue, failures } = JSON.parse(readFileSync(reportFile, 'utf8'))

/** One line per failing workflow, with the commit it last passed on — the start of the suspect range. */
const failureLine = failure =>
  `- **${failure.workflow}**: ${failure.url}` +
  (failure.lastGreenSha
    ? ` — last passed at ${failure.lastGreenSha}, so suspect \`git log ${failure.lastGreenSha}..${sha}\``
    : '')

/** The prompt the task starts from: what failed, how to treat it, and when to revert instead of fixing. */
const prompt = [
  `CI is failing on \`main\` at ${sha} (${title}). Issue #${issue.number} (${issue.url}) tracks it — read it first: it names every failing workflow, the failed tests, and an excerpt of each failing job's log. Every failure in it failed again when re-run, so none of them is a temporary outage.`,
  '',
  'Failing workflows:',
  '',
  ...failures.map(failureLine),
  '',
  'Treat every failure as one problem with one cause. They appeared together on one push, and CI runs on every pull request before it merges, so independent breaks do not land on `main` at once — several drag-and-drop tests failing together, or every snapshot test failing together, is one change that broke them. Find that change first: the commits between the last green run and this one, and the pull request each came from.',
  '',
  'Reproduce before theorising: run the failing tests locally rather than reading the log and guessing. `docs/testing.md` describes how each suite runs.',
  '',
  'Then either fix forward or revert. **Revert the breaking commit instead of fixing it** (`git revert <sha>`) when any of these holds:',
  '',
  '- The failing tests cannot be fixed.',
  '- Fixing them would break something else.',
  '- Fixing them would greatly expand the scope of the original commit or its pull request.',
  '- Fixing them would make a design decision that changes the UX.',
  '',
  'When you revert, say in the pull request description which of these applies and why, and link the pull request the reverted commit came from so its author sees it. When you fix forward, keep the fix to what the failures need.',
  '',
  'Never make a test pass by skipping it, disabling it, loosening its assertion, or lengthening a timeout, and never regenerate a snapshot unless the change that broke it was an intended UI change.',
  '',
  `The pull request description must begin with the line "Fixes #${issue.number}" — nothing above it — and must still begin with it every time you rewrite the description. That line links the pull request to the issue, closes the issue when the pull request merges, and is how the merge automation recognises this pull request as a fix for \`main\`.`,
  '',
  'The pull request is merged automatically once your session has finished and every check on it has completed and passed — no human reviews it first. So leave nothing for later: whatever is on the branch when your session ends is what lands on `main`. Do not request a review when you finish.',
].join('\n')

/** Starts the Copilot cloud agent task, opening a pull request against `main`, and returns it. */
const startTask = async () => {
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
      create_pull_request: true,
      base_ref: 'main',
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

/** Links the task from the tracking issue, so a reader of the issue knows a fix is underway. */
const comment = async taskUrl => {
  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues/${issue.number}/comments`,
    {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${process.env.GH_TOKEN}`,
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({
        body: [
          `A Copilot task (\`${MODEL}\`) is fixing this: [task](${taskUrl}). Its pull request merges on its own once every check on it has passed.`,
          ...(process.env.RUN_URL ? ['', `Started by [Main Fix](${process.env.RUN_URL}).`] : []),
        ].join('\n'),
      }),
    },
  )
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
}

const task = await startTask()
console.error(`Started ${MODEL} task for #${issue.number}: ${task.html_url}`)

process.stdout.write(
  [
    '## Main fix task',
    '',
    `- [#${issue.number}](${issue.url}) — [Copilot task](${task.html_url}) \`${MODEL}\``,
    ...failures.map(failureLine),
    '',
  ].join('\n'),
)

try {
  await comment(task.html_url)
} catch (e) {
  console.error(`Started the task, but could not comment on #${issue.number}: ${e.message}`)
  process.exit(1)
}
