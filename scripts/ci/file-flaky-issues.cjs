/**
 * Files one tracking issue per intermittently failing Puppeteer test, matching the repo's existing
 * convention: title `Flaky test: <file> > <full name>`, label `test`. Deduplicated by exact title
 * match against all open issues, so nightly runs are idempotent and human-filed issues are
 * respected. A test whose tracking issue was closed — fixed once, flaky again — reopens that issue
 * rather than filing a second one, so every occurrence and every attempted fix stay on one issue.
 *
 * Resolves the tracking issue for every failing test — the one just created, the one just reopened,
 * or the open one that already existed — and writes them to flaky-results/flaky-issues.json for
 * `Start Copilot tasks`, which dispatches an agent at each entry whose `status` is `created`,
 * `reopened` or `stalled`. An open issue is `stalled` when its test failed intermittently again and
 * nobody is working on it — no assignee and no open pull request referencing it — which is how a
 * flake whose last dispatch failed, overflowed the task cap, or ended in a closed pull request gets
 * an agent again. Consistent failures are never filed, but are still listed when a tracking issue
 * for them is already open.
 *
 * Loaded by the `File tracking issues` step of .github/workflows/puppeteer-flaky.yml through
 * actions/github-script. Reads flaky-results/flaky-summary.json (written by
 * scripts/flaky-report.mjs) and RUN_URL from the environment.
 */
const fs = require('node:fs')

// Cap the issues one run may put on the tracker, filed or reopened, so a catastrophic run (e.g.
// main broken, every suite failing) cannot flood it. Dedupe makes the next run pick up any overflow
// that is still failing.
const MAX_ISSUES_OPENED = 10

const SUMMARY_FILE = 'flaky-results/flaky-summary.json'
const ISSUES_FILE = 'flaky-results/flaky-issues.json'

/** The label every tracking issue carries, which is also what bounds the closed-issue lookup. */
const LABEL = 'test'

/** Issue title for a failed test, matching the existing manual convention (see e.g. #4640). */
const issueTitle = t => {
  // File-load failures embed a truncated error message in fullName, which varies run-to-run;
  // normalize so the title dedupes stably.
  const name = t.fullName.startsWith('(file load') ? '(file load failure)' : t.fullName
  const file = t.file.split('/').pop()
  // GitHub caps titles at 256 characters.
  return `Flaky test: ${file} > ${name}`.slice(0, 256)
}

/**
 * What this run observed about a failing test, under a lead-in line saying why it is being written —
 * the body of the issue this files, or of the comment it leaves on the issue it reopens.
 */
const failureReport = (leadIn, t) =>
  [
    leadIn,
    '',
    `- **File**: \`${t.file}\``,
    `- **Test**: ${t.fullName}`,
    `- **Failed**: ${t.failed} of ${t.of} iterations (failed on ${t.iterations.length === 1 ? 'iteration' : 'iterations'} ${t.iterations.join(', ')})`,
    ...(t.firstError ? ['', '**First error**:', '', '```', t.firstError, '```'] : []),
  ].join('\n')

/**
 * Whether anyone is working on an open tracking issue: it has an assignee, or an open pull request
 * references it. The pull request a Copilot task opens starts with a description quoting its prompt,
 * which names the issue, and the cross-reference that leaves on the issue survives the agent
 * rewriting the description — so a task still running counts as working on it, and one whose pull
 * request was closed unmerged does not.
 */
const isAttended = async ({ github, owner, repo, issue }) => {
  if (issue.assignees?.length > 0) return true
  const events = await github.paginate(github.rest.issues.listEventsForTimeline, {
    owner,
    repo,
    issue_number: issue.number,
    per_page: 100,
  })
  return events.some(
    e => e.event === 'cross-referenced' && e.source?.issue?.pull_request && e.source.issue.state === 'open',
  )
}

/** Files a deduplicated tracking issue for each intermittently failing test in the run summary. */
const fileFlakyIssues = async ({ github, context, core }) => {
  const { owner, repo } = context.repo

  if (!fs.existsSync(SUMMARY_FILE)) {
    // Aggregator crashed before writing a summary; the job summary already reports that case and
    // there is no per-test data to file.
    core.info('No flaky-summary.json; skipping issue filing.')
    return
  }
  const summary = JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'))
  const failedTests = summary.failedTests || []
  if (failedTests.length === 0) {
    core.info('No failing tests; skipping issue filing.')
    return
  }

  // Exact-title dedupe against all open issues. listForRepo includes PRs; filter them out.
  const openIssues = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
    per_page: 100,
  })
  const openByTitle = new Map(openIssues.filter(i => !i.pull_request).map(i => [i.title, i]))

  // The same dedupe against closed issues, which is what tells a flake that has come back from one
  // nobody has seen before. Bounded to the `test` label — a couple of hundred issues against the
  // several thousand every closed issue in this repository would be — which is a label this
  // workflow puts on everything it files. A tracking issue closed without it is not found here and
  // is filed afresh, exactly as it was before this existed.
  const closedIssues = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'closed',
    labels: LABEL,
    per_page: 100,
  })
  const closedByTitle = new Map(
    closedIssues
      .filter(i => !i.pull_request)
      // listForRepo answers newest first and a Map keeps the last entry written for a key, so
      // reverse to reopen the most recent issue when a test has been filed and closed more than once.
      .toReversed()
      .map(i => [i.title, i]),
  )

  /** Tracking issue per failing test, in summary order, for the Copilot dispatch to read. */
  const issues = []
  let opened = 0
  for (const t of failedTests) {
    const title = issueTitle(t)
    const open = openByTitle.get(title)
    if (open) {
      // A consistent failure is not a flake, so it never gets a flake-fixing agent, attended or not.
      const stalled = t.failed < t.of && !(await isAttended({ github, owner, repo, issue: open }))
      core.info(`Open issue already exists${stalled ? ' with nobody working on it' : ''}: ${title}`)
      issues.push({
        file: t.file,
        fullName: t.fullName,
        number: open.number,
        url: open.html_url,
        status: stalled ? 'stalled' : 'tracked',
      })
      continue
    }
    // Only intermittent failures are flakes. A test that failed every iteration is a consistent
    // failure (i.e. a regression) and is reported in the job summary, but is neither filed nor
    // reopened as a flake.
    if (t.failed === t.of) {
      core.info(`Consistent failure, not filing: ${title}`)
      continue
    }
    if (opened >= MAX_ISSUES_OPENED) {
      core.warning(
        `Issue cap (${MAX_ISSUES_OPENED}) reached; leaving this test alone: ${title}. ` +
          'A later run will file or reopen it if it is still failing.',
      )
      continue
    }

    // A closed issue means this flake was fixed once and has come back. Reopening it keeps every
    // occurrence — and the pull request that closed it — on one issue, where the next agent reads
    // what the last fix tried, instead of starting a trail that says nothing about the last attempt.
    const closed = closedByTitle.get(title)
    if (closed) {
      await github.rest.issues.update({
        owner,
        repo,
        issue_number: closed.number,
        state: 'open',
        state_reason: 'reopened',
      })
      await github.rest.issues.createComment({
        owner,
        repo,
        issue_number: closed.number,
        body: failureReport(
          `This test is failing again, so the [Puppeteer Flaky workflow](${process.env.RUN_URL}) reopened this issue.`,
          t,
        ),
      })
      openByTitle.set(title, closed)
      issues.push({
        file: t.file,
        fullName: t.fullName,
        number: closed.number,
        url: closed.html_url,
        status: 'reopened',
      })
      opened++
      core.info(`Reopened issue #${closed.number}: ${title}`)
      continue
    }

    const { data: issue } = await github.rest.issues.create({
      owner,
      repo,
      title,
      body: failureReport(`Automatically filed by the [Puppeteer Flaky workflow](${process.env.RUN_URL}).`, t),
      labels: [LABEL],
    })
    openByTitle.set(title, issue)
    issues.push({ file: t.file, fullName: t.fullName, number: issue.number, url: issue.html_url, status: 'created' })
    opened++
    core.info(`Filed issue: ${title}`)
  }

  fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2))
  const created = issues.filter(i => i.status === 'created').length
  const stalled = issues.filter(i => i.status === 'stalled').length
  core.info(
    `Filed ${created} new issue(s); reopened ${opened - created}; ${issues.length - opened} already open, ${stalled} of them with nobody working on it.`,
  )
}

module.exports = fileFlakyIssues
