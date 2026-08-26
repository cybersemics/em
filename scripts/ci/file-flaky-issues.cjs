/**
 * Files one tracking issue per intermittently failing Puppeteer test, matching the repo's existing
 * convention: title `Flaky test: <file> > <full name>`, label `test`. Deduplicated by exact title
 * match against all open issues, so nightly runs are idempotent and human-filed issues are
 * respected.
 *
 * Resolves the tracking issue for every failing test — the one just created, or the open one that
 * already existed — and writes them to flaky-results/flaky-issues.json so the steps that run after
 * this one can use them: `Notify Discord` links each offender in its alert, and `Start Copilot
 * tasks` dispatches an agent at each entry marked `created`. Consistent failures are never filed,
 * but are still linked when a tracking issue for them is already open.
 *
 * Loaded by the `File tracking issues` step of .github/workflows/puppeteer-flaky.yml through
 * actions/github-script. Reads flaky-results/flaky-summary.json (written by
 * scripts/flaky-report.mjs) and RUN_URL from the environment.
 */
const fs = require('node:fs')

// Cap issue creation per run so a catastrophic run (e.g. main broken, every suite failing) cannot
// flood the tracker. Dedupe makes the next run pick up any overflow that is still failing.
const MAX_NEW_ISSUES = 10

const SUMMARY_FILE = 'flaky-results/flaky-summary.json'
const ISSUES_FILE = 'flaky-results/flaky-issues.json'

/** Issue title for a failed test, matching the existing manual convention (see e.g. #4640). */
const issueTitle = t => {
  // File-load failures embed a truncated error message in fullName, which varies run-to-run;
  // normalize so the title dedupes stably.
  const name = t.fullName.startsWith('(file load') ? '(file load failure)' : t.fullName
  const file = t.file.split('/').pop()
  // GitHub caps titles at 256 characters.
  return `Flaky test: ${file} > ${name}`.slice(0, 256)
}

/** Issue body for a failed test, linking back to the run that detected it. */
const issueBody = t =>
  [
    `Automatically filed by the [Puppeteer Flaky workflow](${process.env.RUN_URL}).`,
    '',
    `- **File**: \`${t.file}\``,
    `- **Test**: ${t.fullName}`,
    `- **Failed**: ${t.failed} of ${t.of} iterations (failed on ${t.iterations.length === 1 ? 'iteration' : 'iterations'} ${t.iterations.join(', ')})`,
    ...(t.firstError ? ['', '**First error**:', '', '```', t.firstError, '```'] : []),
  ].join('\n')

/** Files a deduplicated tracking issue for each intermittently failing test in the run summary. */
const fileFlakyIssues = async ({ github, context, core }) => {
  const { owner, repo } = context.repo

  if (!fs.existsSync(SUMMARY_FILE)) {
    // Aggregator crashed before writing a summary; the Discord step already reports that case and
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

  /** Tracking issue per failing test, in summary order, for the Discord alert to link. */
  const issues = []
  let created = 0
  for (const t of failedTests) {
    const title = issueTitle(t)
    const open = openByTitle.get(title)
    if (open) {
      core.info(`Open issue already exists, skipping: ${title}`)
      issues.push({ file: t.file, fullName: t.fullName, number: open.number, url: open.html_url, created: false })
      continue
    }
    // Only intermittent failures are flakes. A test that failed every iteration is a consistent
    // failure (i.e. a regression) and is reported to Discord and the job summary, but not filed as
    // a flake.
    if (t.failed === t.of) {
      core.info(`Consistent failure, not filing: ${title}`)
      continue
    }
    if (created >= MAX_NEW_ISSUES) {
      core.warning(
        `Issue cap (${MAX_NEW_ISSUES}) reached; not filing an issue for: ${title}. ` +
          'It will be filed by a later run if it is still failing.',
      )
      continue
    }
    const { data: issue } = await github.rest.issues.create({
      owner,
      repo,
      title,
      body: issueBody(t),
      labels: ['test'],
    })
    openByTitle.set(title, issue)
    issues.push({ file: t.file, fullName: t.fullName, number: issue.number, url: issue.html_url, created: true })
    created++
    core.info(`Filed issue: ${title}`)
  }

  fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2))
  core.info(`Filed ${created} new issue(s); ${issues.length - created} already tracked.`)
}

module.exports = fileFlakyIssues
