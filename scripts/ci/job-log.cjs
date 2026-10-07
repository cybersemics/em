/**
 * Reads the useful part of a failed GitHub Actions job's log, for the automations that hand a
 * failure to an agent — Dependabot Fix and Main Fix. Both put an excerpt of the log in the agent's
 * prompt, and Main Fix also names the failed tests in the issue it files.
 *
 * CommonJS because its callers are loaded by actions/github-script with require().
 */

/** Lines kept per log excerpt. */
const MAX_LOG_LINES = 40

/** Characters kept per log excerpt, so one pathologically long line cannot swallow the prompt. */
const MAX_LOG_CHARS = 2500

/** Log lines that are pure runner bookkeeping and carry nothing a reader needs. */
const NOISE = /^##\[(?:start-action|end-action|endgroup\]|debug\])/

/**
 * A failed test as Vitest's default reporter prints it: ` FAIL  <file> > <suite> > <test>`, once
 * per failure in the summary at the end of the run. `×` is the same failure in the live progress
 * output, which repeats what the summary says and so is not matched.
 */
const FAILED_TEST = /^\s*FAIL\s+(\S.*?)\s*$/

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
 * The failed tests a job log names, in order and without repeats. Vitest prints a FAIL line both
 * for a failed test and for a file that failed to load at all, and either is worth naming. Empty
 * for a job that is not a Vitest run — Lint, or a build that never reached the tests.
 */
const failedTests = lines => [...new Set(lines.map(line => (FAILED_TEST.exec(line) || [])[1]).filter(Boolean))]

/**
 * Fetches one job's log as clean lines, or null when it cannot be read. The logs endpoint answers
 * a redirect to blob storage that rejects the Authorization header, so the redirect is followed by
 * hand rather than through octokit. A missing or expired log is not worth failing the run over —
 * the caller still has the job's name and link.
 */
const jobLogLines = async ({ owner, repo, jobId, core }) => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`
    const redirect = await fetch(url, {
      headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${process.env.GH_TOKEN}` },
      redirect: 'manual',
    })
    const location = redirect.headers.get('location')
    const response = location ? await fetch(location) : redirect
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    return cleanLog(await response.text())
  } catch (e) {
    core.warning(`Could not read the log for job ${jobId}: ${e.message}`)
    return null
  }
}

/** Fetches one job's log excerpt, or null when the log cannot be read. */
const jobLog = async params => {
  const lines = await jobLogLines(params)
  return lines ? excerpt(lines) : null
}

/** Run and job ids, which an Actions check run carries only in the URL it links a human to. */
const parseDetailsUrl = url => {
  const match = /\/actions\/runs\/(\d+)\/job\/(\d+)/.exec(url || '')
  return match ? { runId: match[1], jobId: match[2] } : null
}

module.exports = { cleanLog, excerpt, failedTests, jobLog, jobLogLines, parseDetailsUrl }
