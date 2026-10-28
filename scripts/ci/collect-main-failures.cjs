/**
 * Decides what to do about CI failing on `main`: re-run it once, do nothing, or file (or link) a
 * tracking issue and hand the failure to an agent. Writes what it found to main-fix/report.json for
 * the step that starts the task.
 *
 * Loaded by the `Collect failures` step of .github/workflows/main-fix.yml through
 * actions/github-script. Reads SHA (the commit on `main` to inspect), DISPATCHED (`true` on a manual
 * dispatch), and GH_TOKEN from the environment. Sets three outputs:
 *
 * - `rerun` — space-separated ids of failed runs to re-run once, or empty.
 * - `dispatch` — `true` when a Copilot task should start.
 * - `issue` — the tracking issue's number, when there is one.
 *
 * The workflow fires on every completion of a CI workflow on `main`, and every call looks at the
 * whole commit rather than at the run that triggered it. That is what groups the failures: Lint,
 * Test, and Puppeteer failing on one push are one broken commit, so only the call that sees the
 * last of them finish goes on, and it reports all of them in one issue and one task. It is also
 * what makes a dropped call harmless — the workflow's concurrency group drops a pending run when a
 * newer one queues, and the newer one sees everything the dropped one would have.
 */
const fs = require('node:fs')
const { excerpt, failedTests, jobLogLines } = require('./job-log.cjs')

/** Directory the report is written to, shared with start-main-fix-task.mjs. */
const REPORT_DIR = 'main-fix'

/** Report consumed by the step that starts the task. */
const REPORT_FILE = `${REPORT_DIR}/report.json`

/**
 * The CI workflows that run on a push to `main`. Must match the `workflows` list in main-fix.yml,
 * which is what decides when this is called; this decides which runs count once it is.
 */
const CI_WORKFLOWS = new Set(['Lint', 'Test', 'Puppeteer', 'BrowserStack', 'BrowserStack Android', 'Agent Scripts'])

/**
 * Conclusions that mean a run genuinely failed. `cancelled` is excluded because a run on `main` is
 * only cancelled by hand — the CI workflows never supersede a push run — and `skipped`, `neutral`,
 * and `stale` never indicate a broken build.
 */
const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out', 'action_required'])

/**
 * The label every tracking issue carries. It is how an open one is found again, and how
 * merge-main-fix.cjs tells a pull request fixing `main` from any other Copilot pull request.
 */
const LABEL = 'main-fix'

/** Marker identifying an issue this workflow filed, alongside the label a human might also apply. */
const MARKER = '<!-- main-fix -->'

/** Failing jobs to pull a log from, across every failing run. */
const MAX_LOG_JOBS = 5

/** Failed tests listed per job; a broken build can fail hundreds, and the first few say enough. */
const MAX_TESTS = 30

/** The newest run of each CI workflow on the commit. A re-run keeps its id, so this is one per workflow. */
const latestRunsByWorkflow = runs => {
  const byWorkflow = new Map()
  for (const run of runs) {
    if (!CI_WORKFLOWS.has(run.name)) continue
    const current = byWorkflow.get(run.name)
    if (!current || run.id > current.id) byWorkflow.set(run.name, run)
  }
  return [...byWorkflow.values()]
}

/** The commit's first line, which is the pull request title on a squash-merged `main`. */
const subject = run => ((run.head_commit && run.head_commit.message) || '').split('\n')[0]

/** Markdown link to a commit, by its short hash. */
const commitLink = ({ owner, repo, sha }) =>
  `[\`${sha.slice(0, 7)}\`](https://github.com/${owner}/${repo}/commit/${sha})`

/**
 * The latest completed run of a workflow on `main`, or the latest successful one before a given
 * run number. Both come from the same listing, newest first.
 */
const mainRuns = async ({ github, owner, repo, run, status }) =>
  (
    await github.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: run.workflow_id,
      branch: 'main',
      event: 'push',
      status,
      per_page: 20,
    })
  ).data.workflow_runs

/** Renders the Current Behavior entry for one failing run: its link, its last green commit, and its jobs. */
const failureSection = ({ owner, repo, failure }) => [
  `### ${failure.workflow}`,
  '',
  `[Run](${failure.url}) failed on attempt ${failure.attempt}.` +
    (failure.lastGreenSha
      ? ` It last passed on \`main\` at ${commitLink({ owner, repo, sha: failure.lastGreenSha })}.`
      : ''),
  '',
  ...failure.jobs.flatMap(job => [
    `- **${job.name}** — [job](${job.url})`,
    ...job.tests.map(test => `  - \`${test}\``),
    ...(job.moreTests ? [`  - …and ${job.moreTests} more`] : []),
  ]),
  '',
  ...failure.jobs
    .filter(job => job.excerpt)
    .flatMap(job => [
      `<details><summary>${job.name} — log excerpt</summary>`,
      '',
      '```',
      job.excerpt,
      '```',
      '',
      '</details>',
      '',
    ]),
]

/** The tracking issue's body, in the template docs/testing.md § Reporting Bugs asks of every bug. */
const issueBody = ({ owner, repo, sha, title, failures }) =>
  [
    MARKER,
    `<!-- sha: ${sha} -->`,
    '',
    `CI failed on \`main\` at ${commitLink({ owner, repo, sha })} — ${title} — and failed again when re-run, so it is not a temporary outage.`,
    '',
    '## Steps to Reproduce',
    '',
    `1. Check out ${commitLink({ owner, repo, sha })}.`,
    `2. Run ${failures.map(failure => `the ${failure.workflow} workflow`).join(', ')}.`,
    '',
    '## Current Behavior',
    '',
    ...failures.flatMap(failure => failureSection({ owner, repo, failure })),
    '## Expected Behavior',
    '',
    'Every CI workflow should pass on `main`.',
  ].join('\n')

/** The comment added to an issue that is already open when more runs fail. */
const followUpBody = ({ owner, repo, sha, failures }) =>
  [
    MARKER,
    `CI failed on \`main\` again at ${commitLink({ owner, repo, sha })}, confirmed by a re-run.`,
    '',
    ...failures.flatMap(failure => failureSection({ owner, repo, failure })),
  ].join('\n')

/** Creates the tracking label if this repository does not have it yet. */
const ensureLabel = async ({ github, owner, repo }) => {
  try {
    await github.rest.issues.getLabel({ owner, repo, name: LABEL })
  } catch (e) {
    if (e.status !== 404) throw e
    await github.rest.issues.createLabel({
      owner,
      repo,
      name: LABEL,
      color: 'b60205',
      description: 'CI is failing on main; filed by the Main Fix workflow',
    })
  }
}

/** Reads the failed jobs of one run, with their failed tests and a log excerpt while the budget lasts. */
const failedJobs = async ({ github, owner, repo, run, core, budget }) => {
  const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRun, {
    owner,
    repo,
    run_id: run.id,
    filter: 'latest',
    per_page: 100,
  })
  const result = []
  for (const job of jobs.filter(job => FAILED_CONCLUSIONS.has(job.conclusion))) {
    const lines = budget.logs > 0 ? await jobLogLines({ owner, repo, jobId: job.id, core }) : null
    budget.logs--
    const tests = lines ? failedTests(lines) : []
    result.push({
      name: job.name,
      url: job.html_url,
      tests: tests.slice(0, MAX_TESTS),
      moreTests: Math.max(0, tests.length - MAX_TESTS),
      excerpt: lines ? excerpt(lines) : null,
    })
  }
  return result
}

/** Decides whether to re-run, ignore, or report CI failing on one commit on `main`. */
const collectMainFailures = async ({ github, context, core }) => {
  const { owner, repo } = context.repo
  const sha = (process.env.SHA || '').trim()
  const dispatched = process.env.DISPATCHED === 'true'

  core.setOutput('rerun', '')
  core.setOutput('dispatch', 'false')

  if (!/^[0-9a-f]{40}$/.test(sha)) {
    core.setFailed(`Refusing to proceed: not a full commit SHA (${JSON.stringify(sha)}).`)
    return
  }

  const allRuns = await github.paginate(github.rest.actions.listWorkflowRunsForRepo, {
    owner,
    repo,
    head_sha: sha,
    branch: 'main',
    event: 'push',
    per_page: 100,
  })
  const runs = latestRunsByWorkflow(allRuns)

  if (runs.length === 0) {
    core.info(`${sha.slice(0, 7)}: no CI run on main; nothing to do.`)
    return
  }

  // A re-run this workflow started is pending too, so this is also what waits out the re-run.
  const pending = runs.filter(run => run.status !== 'completed')
  if (pending.length > 0) {
    core.info(`${sha.slice(0, 7)}: still running — ${pending.map(run => run.name).join(', ')}. Not the last one out.`)
    return
  }

  let failed = runs.filter(run => FAILED_CONCLUSIONS.has(run.conclusion))
  if (failed.length === 0) {
    core.info(`${sha.slice(0, 7)}: nothing failed, or everything that failed passed when re-run.`)
    return
  }

  // A failure that a newer commit has already turned green is not worth a task: whatever broke was
  // fixed in the meantime. Rare, since a push to main normally finishes before the next one, but a
  // manual dispatch on an old commit hits it every time.
  const current = []
  for (const run of failed) {
    const [latest] = await mainRuns({ github, owner, repo, run, status: 'completed' })
    if (latest && latest.run_number > run.run_number && latest.conclusion === 'success') {
      core.info(`${run.name}: already passing again on ${latest.head_sha.slice(0, 7)}; ignoring.`)
    } else {
      current.push(run)
    }
  }
  failed = current
  if (failed.length === 0) return

  // One re-run per run, to tell a temporary outage — a service down, a runner lost — from a broken
  // commit. Every first-attempt failure on the commit is re-run, not just the one that triggered
  // this call, because the call a dropped run would have made is this one. The re-runs leave the
  // runs pending, and the call that sees the last of them finish comes back here with every failure
  // on its second attempt. A manual dispatch skips the re-run: someone already looked.
  const firstAttempts = failed.filter(run => run.run_attempt === 1)
  if (firstAttempts.length > 0 && !dispatched) {
    core.setOutput('rerun', firstAttempts.map(run => run.id).join(' '))
    core.info(`${sha.slice(0, 7)}: re-running ${firstAttempts.map(run => run.name).join(', ')} once.`)
    return
  }

  const budget = { logs: MAX_LOG_JOBS }
  const failures = []
  for (const run of failed) {
    const green = await mainRuns({ github, owner, repo, run, status: 'success' })
    const lastGreen = green.find(candidate => candidate.run_number < run.run_number)
    failures.push({
      workflow: run.name,
      url: run.html_url,
      attempt: run.run_attempt,
      lastGreenSha: lastGreen ? lastGreen.head_sha : null,
      jobs: await failedJobs({ github, owner, repo, run, core, budget }),
    })
  }

  const title = subject(failed[0])

  // One issue for main at a time. CI on every pull request keeps independent breaks from landing
  // together, so a failure while one is open is the same break, or one stacked on top of it, and
  // belongs to the task already working on it.
  const open = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    labels: LABEL,
    state: 'open',
    per_page: 100,
  })
  const existing = open.find(issue => !issue.pull_request)

  let issue
  if (existing) {
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: existing.number,
      per_page: 100,
    })
    const seen = [existing.body || '', ...comments.map(comment => comment.body || '')].join('\n')
    const unseen = failures.filter(failure => !seen.includes(failure.url))
    if (unseen.length > 0) {
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: existing.number,
        body: followUpBody({ owner, repo, sha, failures: unseen }),
      })
    }
    issue = { number: existing.number, url: existing.html_url, status: 'tracked' }
    core.info(`${sha.slice(0, 7)}: linked to #${existing.number}, which is already open.`)
  } else {
    await ensureLabel({ github, owner, repo })
    const { data: created } = await github.rest.issues.create({
      owner,
      repo,
      title: `CI failing on main: ${failures.map(failure => failure.workflow).join(', ')}`,
      body: issueBody({ owner, repo, sha, title, failures }),
      labels: [LABEL],
    })
    issue = { number: created.number, url: created.html_url, status: 'created' }
    core.info(`${sha.slice(0, 7)}: filed #${created.number}.`)
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.writeFileSync(REPORT_FILE, JSON.stringify({ sha, title, issue, failures }, null, 2))

  core.setOutput('issue', String(issue.number))
  // An open issue already has a task on it; a manual dispatch is someone asking for another.
  core.setOutput('dispatch', String(issue.status === 'created' || dispatched))

  core.summary.addRaw(
    `${issue.status === 'created' ? 'Filed' : 'Linked to'} [#${issue.number}](${issue.url}): ` +
      `${failures.map(failure => `[${failure.workflow}](${failure.url})`).join(', ')} failing on ${sha.slice(0, 7)}.`,
  )
  await core.summary.write()
}

module.exports = collectMainFailures
module.exports.LABEL = LABEL
