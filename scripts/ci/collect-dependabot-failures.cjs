/**
 * Collects the failing checks on a Dependabot pull request and decides whether they warrant an
 * agent session, writing what it found to dependabot-fix/report.json for the step that starts one.
 *
 * Loaded by the `Collect failing checks` step of .github/workflows/dependabot-fix.yml through
 * actions/github-script. Reads HEAD_BRANCH (or PR_NUMBER on a manual dispatch) and GH_TOKEN from
 * the environment, and sets a `dispatch` output that gates every step after it.
 *
 * The workflow fires on every check completion, so most calls here end at one of the guards below.
 * Only the run that sees the *last* check complete goes on to report, which is what keeps four
 * failing checks from starting four sessions on one pull request. This workflow is
 * `workflow_run`-triggered and so posts no check run of its own to the pull request head, and does
 * not have to exclude itself from that count.
 */
const fs = require('node:fs')

/** Directory the report is written to, shared with start-dependabot-fix-task.mjs. */
const REPORT_DIR = 'dependabot-fix'

/** Report consumed by the step that starts the session. */
const REPORT_FILE = `${REPORT_DIR}/report.json`

/** The only pull request author this acts on; the branch prefix alone is not proof of one. */
const DEPENDABOT = 'dependabot[bot]'

/**
 * Conclusions that mean a check genuinely failed. `cancelled` is excluded because that is what
 * Cancel PR Runs does to a merged pull request's in-flight checks, and `skipped`, `neutral`, and
 * `stale` never indicate a broken build.
 */
const FAILED_CONCLUSIONS = new Set(['failure', 'timed_out', 'action_required'])

/**
 * Marker identifying the single session comment this workflow maintains on a pull request. Must
 * match the one in scripts/ci/start-dependabot-fix-task.mjs, which writes it.
 */
const MARKER = '<!-- dependabot-fix -->'

/**
 * Sessions started per pull request before this gives up on it. A bump the agent cannot fix in
 * three attempts is not one more attempt away from being fixed, and each attempt moves the head
 * commit, which is what the per-commit dedupe keys on.
 */
const MAX_SESSIONS = 3

/** Failing jobs to pull a log excerpt from, in the order the checks API returned them. */
const MAX_LOG_JOBS = 3

/** Lines kept per log excerpt. */
const MAX_LOG_LINES = 40

/** Characters kept per log excerpt, so one pathologically long line cannot swallow the prompt. */
const MAX_LOG_CHARS = 2500

/** Log lines that are pure runner bookkeeping and carry nothing a reader needs. */
const NOISE = /^##\[(?:start-action|end-action|endgroup\]|debug\])/

/** Splits a raw job log into readable lines, dropping the ISO timestamp, ANSI codes, and noise. */
const cleanLog = text =>
  text
    .split('\n')
    .map(line =>
      line
        .replace(/^\d{4}-\d{2}-\d{2}T\S+Z /, '')
        .replace(/\u001b\[[0-9;]*[A-Za-z]/g, '')
        .trimEnd(),
    )
    .filter(line => line && !NOISE.test(line))

/**
 * The interesting window of a job log. The tail is worthless on its own — every Actions job ends
 * with the same twenty lines of checkout cleanup — so this anchors on the `##[error]` annotations
 * the runner emits, keeping enough before the first one to show which command was running and
 * enough after the last one to catch a multi-line type error. Falls back to the tail when a job
 * failed without annotating anything.
 */
const excerpt = lines => {
  const errors = lines.map((line, i) => (line.startsWith('##[error]') ? i : -1)).filter(i => i >= 0)
  const window = errors.length
    ? lines.slice(Math.max(0, errors[0] - 20), Math.min(lines.length, errors[errors.length - 1] + 9))
    : lines.slice(-MAX_LOG_LINES)
  const kept = window.slice(0, MAX_LOG_LINES)
  const text = kept.join('\n')
  // Marked either way, so nothing reading this mistakes a clipped log for the whole of one.
  const clipped = kept.length < window.length || text.length > MAX_LOG_CHARS
  return clipped ? `${text.slice(0, MAX_LOG_CHARS)}\n…` : text
}

/**
 * Fetches one job's log, or null when it cannot be read. The logs endpoint answers a redirect to
 * blob storage that rejects the Authorization header, so the redirect is followed by hand rather
 * than through octokit. A missing or expired log is not worth failing the run over — the session
 * still gets the check names and links.
 */
const jobLog = async ({ owner, repo, jobId, core }) => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`
    const redirect = await fetch(url, {
      headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${process.env.GH_TOKEN}` },
      redirect: 'manual',
    })
    const location = redirect.headers.get('location')
    const response = location ? await fetch(location) : redirect
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return excerpt(cleanLog(await response.text()))
  } catch (e) {
    core.warning(`Could not read the log for job ${jobId}: ${e.message}`)
    return null
  }
}

/** Run and job ids, which an Actions check run carries only in the URL it links a human to. */
const parseDetailsUrl = url => {
  const match = /\/actions\/runs\/(\d+)\/job\/(\d+)/.exec(url || '')
  return match ? { runId: match[1], jobId: match[2] } : null
}

/** Collects the failing checks on a Dependabot pull request and reports whether to start a session. */
const collectDependabotFailures = async ({ github, context, core }) => {
  const { owner, repo } = context.repo
  // A manual dispatch names the pull request; the automatic trigger names its branch.
  const prNumber = Number(process.env.PR_NUMBER || '0')
  const headBranch = process.env.HEAD_BRANCH

  core.setOutput('dispatch', 'false')

  // Resolved from the branch rather than from workflow_run.pull_requests, which is empty whenever
  // the triggering run's head commit is no longer the head of an open pull request.
  let pr
  if (prNumber) {
    pr = (await github.rest.pulls.get({ owner, repo, pull_number: prNumber })).data
  } else {
    const { data: matches } = await github.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${headBranch}`,
      state: 'open',
      per_page: 1,
    })
    pr = matches[0]
  }

  if (!pr || pr.state !== 'open') {
    core.info(`No open pull request for ${headBranch || `#${prNumber}`}; nothing to fix.`)
    return
  }
  if (pr.user.login !== DEPENDABOT) {
    core.info(`#${pr.number} is authored by ${pr.user.login}, not ${DEPENDABOT}; skipping.`)
    return
  }

  const headSha = pr.head.sha

  // filter=latest collapses re-runs to the check that is actually reported on the pull request.
  const checkRuns = await github.paginate(github.rest.checks.listForRef, {
    owner,
    repo,
    ref: headSha,
    filter: 'latest',
    per_page: 100,
  })

  const pending = checkRuns.filter(check => check.status !== 'completed')
  if (pending.length > 0) {
    core.info(`#${pr.number}: still running — ${pending.map(check => check.name).join(', ')}. Not the last one out.`)
    return
  }

  const failed = checkRuns.filter(check => FAILED_CONCLUSIONS.has(check.conclusion))
  if (failed.length === 0) {
    core.info(`#${pr.number}: no check failed; nothing to fix.`)
    return
  }

  // A check that is red on the base branch too is someone else's bug, and a session on this pull
  // request would chase it in the wrong place. When *every* failure is one of those, the bump is
  // not implicated at all and no session is started.
  let failingOnBase = new Set()
  try {
    const baseChecks = await github.paginate(github.rest.checks.listForRef, {
      owner,
      repo,
      ref: pr.base.ref,
      filter: 'latest',
      per_page: 100,
    })
    failingOnBase = new Set(
      baseChecks.filter(check => FAILED_CONCLUSIONS.has(check.conclusion)).map(check => check.name),
    )
  } catch (e) {
    core.warning(`Could not read the checks on ${pr.base.ref}: ${e.message}`)
  }
  if (failed.every(check => failingOnBase.has(check.name))) {
    core.info(`#${pr.number}: every failing check is also failing on ${pr.base.ref}; not the bump's doing.`)
    return
  }

  // Dedupe. The comment carries the head SHA it was written for, so a session is started once per
  // commit: a rebase, or a fix Dependabot itself pushes, gets a fresh one; a second check finishing
  // on the same commit does not. A manual dispatch overrides this, since someone asked for it.
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pr.number,
    per_page: 100,
  })
  const existing = comments.find(comment => comment.body && comment.body.includes(MARKER))
  if (existing && existing.body.includes(headSha) && !prNumber) {
    core.info(`#${pr.number}: a session was already started for ${headSha.slice(0, 7)}.`)
    return
  }

  // A session that pushes a fix moves the head, and the checks that run on it are a fresh commit as
  // far as the dedupe above is concerned — so a session that cannot fix the bump would start another
  // one every time it tried. The count is kept in the comment, and the comment says which attempt it
  // is, so the cap is visible before it is reached rather than as silence afterwards.
  const sessions = Number((/<!-- sessions: (\d+) -->/.exec(existing ? existing.body : '') || [])[1] || '0')
  if (sessions >= MAX_SESSIONS && !prNumber) {
    core.warning(
      `#${pr.number}: ${sessions} sessions have already run without fixing the checks. Not starting another — ` +
        'this one needs a human, or a manual dispatch.',
    )
    return
  }

  // Workflow names, which a check run does not carry — its `name` is the job's ("Deploy Preview"),
  // not the workflow's ("Vercel Preview"), and the job name alone is hard to place.
  const { data: runs } = await github.rest.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    head_sha: headSha,
    per_page: 100,
  })
  const workflowByRunId = new Map(runs.workflow_runs.map(run => [String(run.id), run.name]))

  const failures = []
  for (const check of failed) {
    const ids = parseDetailsUrl(check.details_url)
    failures.push({
      name: check.name,
      workflow: ids ? workflowByRunId.get(ids.runId) || null : null,
      url: check.details_url,
      alsoFailingOnBase: failingOnBase.has(check.name),
      excerpt: ids && failures.length < MAX_LOG_JOBS ? await jobLog({ owner, repo, jobId: ids.jobId, core }) : null,
    })
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.writeFileSync(
    REPORT_FILE,
    JSON.stringify(
      {
        pr: {
          number: pr.number,
          url: pr.html_url,
          title: pr.title,
          headRef: pr.head.ref,
          headSha,
          baseRef: pr.base.ref,
        },
        failures,
        sessions,
        maxSessions: MAX_SESSIONS,
        commentId: existing ? existing.id : null,
        runUrl: `${process.env.GITHUB_SERVER_URL}/${owner}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`,
      },
      null,
      2,
    ),
  )

  core.setOutput('dispatch', 'true')
  core.info(`#${pr.number}: ${failures.map(failure => failure.name).join(', ')} failed on ${headSha.slice(0, 7)}.`)
}

module.exports = collectDependabotFailures
