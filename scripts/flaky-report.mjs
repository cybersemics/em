#!/usr/bin/env node
/**
 * Aggregates vitest JSON reports from a Puppeteer flaky-stress run into a markdown
 * report. Used by .github/workflows/puppeteer-flaky.yml.
 *
 * Aggregate failure reports into markdown + flaky-summary.json.
 *
 * ```sh
 * node scripts/flaky-report.mjs <results-dir> <expected-iterations> [run-url]
 * ```
 *
 * Rewrite a vitest JSON report in place, keeping only failed tests.
 *
 * ```sh
 * node scripts/flaky-report.mjs --trim <vitest-report.json>
 * ```
 *
 * CI only uploads JSON for **failed** iterations (after --trim). A missing
 * iteration-<n>.json means that iteration passed — not an infra failure.
 * Unparseable / malformed reports are still counted as infra failures.
 *
 * Exit codes (aggregate mode):
 *
 * - 0 — clean run (no failure reports, or no failing tests in them)
 * - 1 — flakes and/or infra failures found
 * - 2 — usage / fatal error.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'

const MARKER = '<!-- flaky-test-report -->'

/**
 * Strip a vitest JSON report down to failed tests only.
 */
const trimVitestFailures = data => {
  const testResults = (data.testResults || [])
    .map(file => {
      const failed = (file.assertionResults || []).filter(a => a.status === 'failed')
      if (failed.length === 0 && file.status !== 'failed') return null
      return {
        name: file.name,
        status: 'failed',
        message: file.message || '',
        assertionResults: failed.map(a => ({
          ancestorTitles: a.ancestorTitles || [],
          fullName: a.fullName || a.title || '(unnamed)',
          title: a.title || a.fullName || '(unnamed)',
          status: 'failed',
          duration: a.duration,
          failureMessages: a.failureMessages || [],
          location: a.location,
        })),
      }
    })
    .filter(Boolean)

  const numFailedTests = testResults.reduce(
    (n, f) => n + ((f.assertionResults || []).length || (f.status === 'failed' ? 1 : 0)),
    0,
  )

  return {
    success: false,
    numFailedTests,
    numFailedTestSuites: testResults.length,
    testResults,
  }
}

// --- --trim mode: rewrite a single vitest JSON to failures only ---
if (process.argv[2] === '--trim') {
  const file = process.argv[3]
  if (!file) {
    console.error('Usage: node scripts/flaky-report.mjs --trim <vitest-report.json>')
    process.exit(2)
  }
  let data
  try {
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    console.error(`Failed to read ${file}: ${e instanceof Error ? e.message : String(e)}`)
    process.exit(2)
  }
  const trimmed = trimVitestFailures(data)
  writeFileSync(file, JSON.stringify(trimmed, null, 2))
  console.info(`Trimmed ${file}: ${trimmed.numFailedTestSuites} file(s), ${trimmed.numFailedTests} failed test(s)`)
  process.exit(0)
}

const [resultsDir, expectedRaw, runUrl = ''] = process.argv.slice(2)

if (!resultsDir || !expectedRaw) {
  console.error('Usage: node scripts/flaky-report.mjs <results-dir> <expected-iterations> [run-url]')
  console.error('       node scripts/flaky-report.mjs --trim <vitest-report.json>')
  process.exit(2)
}

const expectedIterations = Number(expectedRaw)
if (!Number.isInteger(expectedIterations) || expectedIterations < 1) {
  console.error(`Invalid expected-iterations: ${expectedRaw}`)
  process.exit(2)
}

/**
 * Recursively collect files named iteration-<n>.json under dir.
 * @returns Iteration → absolute path.
 */
const collectReports = dir => {
  const found = new Map()
  /** Recurses into one directory, adding any iteration-<n>.json it finds to the accumulated map. */
  const walk = d => {
    let entries
    try {
      entries = readdirSync(d)
    } catch {
      return
    }
    for (const name of entries) {
      const full = join(d, name)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isDirectory()) {
        walk(full)
        continue
      }
      const m = /^iteration-(\d+)\.json$/.exec(name)
      if (m) found.set(Number(m[1]), full)
    }
  }
  walk(dir)
  return found
}

/**
 * Relativize a test filepath for display (strip cwd / workspace prefixes).
 */
const shortPath = filepath => {
  const marker = '/src/e2e/puppeteer/'
  const idx = filepath.lastIndexOf(marker)
  if (idx !== -1) return filepath.slice(idx + 1)
  if (filepath.includes('__tests__')) {
    const parts = filepath.split(/[/\\]/)
    const i = parts.lastIndexOf('__tests__')
    if (i !== -1) return parts.slice(i - 1).join('/')
  }
  return basename(filepath)
}

/**
 * Truncate an error message for the markdown report.
 */
const truncate = (msg, max = 400) => {
  const cleaned = String(msg || '')
    .replace(/\r\n/g, '\n')
    .trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max)}…`
}

/**
 * Record a failed test occurrence into the tests map, keyed by file and full test name.
 */
const recordFailure = (tests, file, fullName, iteration, error = '') => {
  const key = `${file}\0${fullName}`
  let entry = tests.get(key)
  if (!entry) {
    entry = { file, fullName, failed: [], firstError: error || '' }
    tests.set(key, entry)
  }
  entry.failed.push(iteration)
  if (!entry.firstError && error) entry.firstError = error
}

const reports = collectReports(resultsDir)

/** @type {{ iteration: number, reason: string }[]} */
const infraFailures = []

/**
 * Per-test aggregate (failures only).
 * @type {Map<string, { file: string, fullName: string, failed: number[], firstError: string }>}
 */
const tests = new Map()

let failedIterations = 0
let totalFailedAssertions = 0

for (const [iteration, path] of [...reports.entries()].sort((a, b) => a[0] - b[0])) {
  if (iteration < 1 || iteration > expectedIterations) {
    infraFailures.push({
      iteration,
      reason: `report iteration ${iteration} is outside expected range 1..${expectedIterations}`,
    })
    continue
  }

  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    infraFailures.push({
      iteration,
      reason: `unparseable report (${relative(resultsDir, path)}): ${e instanceof Error ? e.message : String(e)}`,
    })
    continue
  }

  if (!data || !Array.isArray(data.testResults)) {
    infraFailures.push({
      iteration,
      reason: `report missing testResults array (${relative(resultsDir, path)})`,
    })
    continue
  }

  // Normalize in case the artifact was uploaded before --trim ran.
  data = trimVitestFailures(data)

  failedIterations++

  for (const fileResult of data.testResults) {
    const file = shortPath(fileResult.name || 'unknown')
    const assertions = Array.isArray(fileResult.assertionResults) ? fileResult.assertionResults : []

    if (assertions.length === 0 && fileResult.status === 'failed') {
      const fullName = fileResult.message ? `(file load) ${truncate(fileResult.message, 80)}` : '(file load failure)'
      recordFailure(tests, file, fullName, iteration, fileResult.message || '')
      totalFailedAssertions++
      continue
    }

    for (const assertion of assertions) {
      if (assertion.status !== 'failed') continue

      const fullName = assertion.fullName || assertion.title || '(unnamed)'
      const error = assertion.failureMessages?.[0] || ''
      recordFailure(tests, file, fullName, iteration, error)
      totalFailedAssertions++
    }
  }
}

const failedTests = [...tests.values()]
  .filter(t => t.failed.length > 0)
  .sort(
    (a, b) => b.failed.length - a.failed.length || a.file.localeCompare(b.file) || a.fullName.localeCompare(b.fullName),
  )

const intermittent = failedTests.filter(t => t.failed.length < expectedIterations)
const consistent = failedTests.filter(t => t.failed.length === expectedIterations)
const passedIterationCount = Math.max(0, expectedIterations - failedIterations - infraFailures.length)

const runLink = runUrl ? `[Workflow run](${runUrl})` : ''
const now = new Date().toUTCString()

const lines = []
lines.push(MARKER)
lines.push('# Puppeteer flaky-test report')
lines.push('')
lines.push(`Generated: ${now}`)
if (runLink) lines.push(runLink)
lines.push('')
lines.push('## Summary')
lines.push('')
lines.push(`| Metric | Value |`)
lines.push(`| --- | --- |`)
lines.push(`| Expected iterations | ${expectedIterations} |`)
lines.push(`| Failed iterations (reports) | ${failedIterations} |`)
lines.push(`| Passed iterations (no report) | ${passedIterationCount} |`)
lines.push(`| Infra failures | ${infraFailures.length} |`)
lines.push(`| Failed tests | ${failedTests.length} |`)
lines.push(`| Intermittent (failed some, not all) | ${intermittent.length} |`)
lines.push(`| Consistent (failed every iteration) | ${consistent.length} |`)
lines.push('')

if (infraFailures.length > 0) {
  lines.push('## Infra failures')
  lines.push('')
  lines.push(
    'Uploaded reports that could not be parsed (distinct from test failures). Missing reports are treated as passed iterations.',
  )
  lines.push('')
  for (const f of infraFailures.sort((a, b) => a.iteration - b.iteration)) {
    lines.push(`- **iteration ${f.iteration}**: ${f.reason}`)
  }
  lines.push('')
}

if (failedTests.length === 0 && infraFailures.length === 0) {
  lines.push('## Result')
  lines.push('')
  lines.push(`Clean run: all ${expectedIterations} iterations passed (no failure reports uploaded).`)
  lines.push('')
} else if (failedTests.length > 0) {
  lines.push('## Failed tests')
  lines.push('')
  lines.push(
    'Only failing tests are listed. Failure rate is `failed / expected iterations`. Missing iteration reports count as passes. Iteration numbers link to the parent workflow run.',
  )
  lines.push('')

  /** Appends a titled markdown section for one group of failing tests, skipping empty groups. */
  const renderGroup = (title, list) => {
    if (list.length === 0) return
    lines.push(`### ${title}`)
    lines.push('')
    for (const t of list) {
      const rate = `${t.failed.length}/${expectedIterations}`
      const iters = t.failed.map(i => (runUrl ? `[${i}](${runUrl})` : String(i))).join(', ')
      lines.push(`#### \`${t.file}\` › ${t.fullName}`)
      lines.push('')
      lines.push(`- **Failed**: ${rate} (iterations: ${iters})`)
      if (t.firstError) {
        lines.push(`- **First error**:`)
        lines.push('')
        lines.push('```')
        lines.push(truncate(t.firstError, 800))
        lines.push('```')
      }
      lines.push('')
    }
  }

  renderGroup('Intermittent failures (likely flakes)', intermittent)
  renderGroup('Consistent failures (likely regressions)', consistent)
}

const markdown = `${lines.join('\n')}\n`

const summary = {
  marker: MARKER,
  generatedAt: now,
  runUrl,
  expectedIterations,
  failedIterations,
  passedIterations: passedIterationCount,
  infraFailureCount: infraFailures.length,
  failedTestCount: failedTests.length,
  intermittentCount: intermittent.length,
  consistentCount: consistent.length,
  totalFailedAssertions,
  clean: failedTests.length === 0 && infraFailures.length === 0,
  failedTests: failedTests.map(t => ({
    file: t.file,
    fullName: t.fullName,
    failed: t.failed.length,
    of: expectedIterations,
    iterations: t.failed,
    firstError: t.firstError ? truncate(t.firstError, 800) : '',
    kind: t.failed.length === expectedIterations ? 'consistent' : 'intermittent',
  })),
  topOffenders: failedTests.slice(0, 5).map(t => ({
    file: t.file,
    fullName: t.fullName,
    failed: t.failed.length,
    of: expectedIterations,
  })),
  infraFailures,
  markdown,
}

writeFileSync(join(resultsDir, 'flaky-summary.json'), JSON.stringify(summary, null, 2))
process.stdout.write(markdown)

if (!summary.clean) process.exit(1)
