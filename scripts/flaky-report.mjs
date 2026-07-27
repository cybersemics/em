#!/usr/bin/env node
/**
 * Aggregates vitest JSON reports from a Puppeteer flaky-stress run into a markdown
 * report. Used by .github/workflows/puppeteer-flaky.yml.
 *
 * Usage:
 *   node scripts/flaky-report.mjs <results-dir> <expected-iterations> [run-url]
 *
 * Looks for files named iteration-<n>.json under <results-dir> (recursively).
 * Missing or unparseable files are counted as infra failures (job died before
 * vitest finished), distinct from test flakes.
 *
 * Exit codes:
 *   0 — clean run (every iteration produced a report and every test passed)
 *   1 — flakes and/or infra failures found
 *   2 — usage / fatal error
 *
 * Also writes <results-dir>/flaky-summary.json with machine-readable counts for
 * downstream workflow steps (Discord, etc.).
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const MARKER = '<!-- flaky-test-report -->'

const [resultsDir, expectedRaw, runUrl = ''] = process.argv.slice(2)

if (!resultsDir || !expectedRaw) {
  console.error('Usage: node scripts/flaky-report.mjs <results-dir> <expected-iterations> [run-url]')
  process.exit(2)
}

const expectedIterations = Number(expectedRaw)
if (!Number.isInteger(expectedIterations) || expectedIterations < 1) {
  console.error(`Invalid expected-iterations: ${expectedRaw}`)
  process.exit(2)
}

/**
 * Recursively collect files named iteration-<n>.json under dir.
 * @returns {Map<number, string>} iteration → absolute path
 */
const collectReports = dir => {
  const found = new Map()
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
 * @param {string} filepath
 */
const shortPath = filepath => {
  const marker = '/src/e2e/puppeteer/'
  const idx = filepath.lastIndexOf(marker)
  if (idx !== -1) return filepath.slice(idx + 1)
  // Prefer basename when the path is absolute and outside the repo.
  if (filepath.includes('__tests__')) {
    const parts = filepath.split(/[/\\]/)
    const i = parts.lastIndexOf('__tests__')
    if (i !== -1) return parts.slice(i - 1).join('/')
  }
  return basename(filepath)
}

/**
 * Truncate an error message for the markdown report.
 * @param {string} msg
 * @param {number} max
 */
const truncate = (msg, max = 400) => {
  const cleaned = String(msg || '')
    .replace(/\r\n/g, '\n')
    .trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max)}…`
}

const reports = collectReports(resultsDir)

/** @type {{ iteration: number, reason: string }[]} */
const infraFailures = []

for (let i = 1; i <= expectedIterations; i++) {
  if (!reports.has(i)) {
    infraFailures.push({ iteration: i, reason: 'missing report (job may have been cancelled, timed out, or crashed before vitest finished)' })
  }
}

/**
 * Per-test aggregate: key = `${file}\0${fullName}`
 * @type {Map<string, { file: string, fullName: string, failed: number[], passed: number, firstError: string }>}
 */
const tests = new Map()

let parsedIterations = 0
let totalFailedAssertions = 0

for (const [iteration, path] of [...reports.entries()].sort((a, b) => a[0] - b[0])) {
  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf8'))
  } catch (e) {
    infraFailures.push({
      iteration,
      reason: `unparseable report (${relative(resultsDir, path)}): ${e instanceof Error ? e.message : String(e)}`,
    })
    reports.delete(iteration)
    continue
  }

  if (!data || !Array.isArray(data.testResults)) {
    infraFailures.push({
      iteration,
      reason: `report missing testResults array (${relative(resultsDir, path)})`,
    })
    continue
  }

  parsedIterations++

  for (const fileResult of data.testResults) {
    const file = shortPath(fileResult.name || 'unknown')
    const assertions = Array.isArray(fileResult.assertionResults) ? fileResult.assertionResults : []

    // File-level failure with no assertions (e.g. load error) — treat as a synthetic test.
    if (assertions.length === 0 && fileResult.status === 'failed') {
      const fullName = fileResult.message ? `(file load) ${truncate(fileResult.message, 80)}` : '(file load failure)'
      const key = `${file}\0${fullName}`
      let entry = tests.get(key)
      if (!entry) {
        entry = { file, fullName, failed: [], passed: 0, firstError: fileResult.message || '' }
        tests.set(key, entry)
      }
      entry.failed.push(iteration)
      totalFailedAssertions++
      continue
    }

    for (const assertion of assertions) {
      const fullName = assertion.fullName || assertion.title || '(unnamed)'
      const key = `${file}\0${fullName}`
      let entry = tests.get(key)
      if (!entry) {
        entry = { file, fullName, failed: [], passed: 0, firstError: '' }
        tests.set(key, entry)
      }

      if (assertion.status === 'failed') {
        entry.failed.push(iteration)
        totalFailedAssertions++
        if (!entry.firstError && assertion.failureMessages?.length) {
          entry.firstError = assertion.failureMessages[0]
        }
      } else if (assertion.status === 'passed') {
        entry.passed++
      }
      // skipped / pending / todo — ignore for flake rates
    }
  }
}

/** Tests that failed at least once and passed at least once, or failed intermittently across iterations. */
const flakes = [...tests.values()]
  .filter(t => t.failed.length > 0)
  .sort((a, b) => b.failed.length - a.failed.length || a.file.localeCompare(b.file) || a.fullName.localeCompare(b.fullName))

// A "flake" in the stress-test sense is any test that failed in at least one
// iteration. Consistent failures (failed every parsed iteration) are still
// surfaced — they are regressions, not intermittent flakes, but the daily
// report must not hide them.
const intermittent = flakes.filter(t => t.failed.length < parsedIterations)
const consistent = flakes.filter(t => parsedIterations > 0 && t.failed.length === parsedIterations)

const runLink = runUrl ? `[Workflow run](${runUrl})` : ''
const now = new Date().toISOString()

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
lines.push(`| Parsed reports | ${parsedIterations} |`)
lines.push(`| Infra failures | ${infraFailures.length} |`)
lines.push(`| Tests with ≥1 failure | ${flakes.length} |`)
lines.push(`| Intermittent (failed some, not all) | ${intermittent.length} |`)
lines.push(`| Consistent (failed every parsed iteration) | ${consistent.length} |`)
lines.push('')

if (infraFailures.length > 0) {
  lines.push('## Infra failures')
  lines.push('')
  lines.push('These iterations did not produce a usable vitest JSON report (distinct from test failures).')
  lines.push('')
  for (const f of infraFailures.sort((a, b) => a.iteration - b.iteration)) {
    lines.push(`- **iteration ${f.iteration}**: ${f.reason}`)
  }
  lines.push('')
}

if (flakes.length === 0 && infraFailures.length === 0) {
  lines.push('## Result')
  lines.push('')
  lines.push(`Clean run: all ${parsedIterations} iterations produced reports and every test passed.`)
  lines.push('')
} else if (flakes.length > 0) {
  lines.push('## Failing tests')
  lines.push('')
  lines.push('Failure rate is `failed / parsed iterations`. Iteration numbers link to the parent workflow run (open the matching matrix job for logs).')
  lines.push('')

  const renderGroup = (title, list) => {
    if (list.length === 0) return
    lines.push(`### ${title}`)
    lines.push('')
    for (const t of list) {
      const rate = `${t.failed.length}/${parsedIterations}`
      const iters = t.failed
        .map(i => (runUrl ? `[${i}](${runUrl})` : String(i)))
        .join(', ')
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
  parsedIterations,
  infraFailureCount: infraFailures.length,
  flakeCount: flakes.length,
  intermittentCount: intermittent.length,
  consistentCount: consistent.length,
  totalFailedAssertions,
  clean: flakes.length === 0 && infraFailures.length === 0,
  topOffenders: flakes.slice(0, 5).map(t => ({
    file: t.file,
    fullName: t.fullName,
    failed: t.failed.length,
    of: parsedIterations,
  })),
  infraFailures,
  markdown,
}

writeFileSync(join(resultsDir, 'flaky-summary.json'), JSON.stringify(summary, null, 2))
process.stdout.write(markdown)

if (!summary.clean) process.exit(1)
