#!/usr/bin/env node
/**
 * Decides whether a TDD run of changed tests against the pre-fix commit proves anything. Run by the
 * TDD workflows (.github/workflows/tdd.yml and tdd-ios.yml) after the changed tests have run on base,
 * as `node scripts/ci/tdd-verdict.mjs <vitest|wdio> <results-file> <exit-code>`.
 *
 * A nonzero exit code is not evidence on its own. A run that crashed while loading its config, a file
 * that failed to import, or a session that never started exits nonzero without a single test having
 * run, and counting that as a red test reported fabricated validations on every fork pull request
 * (#4744). The verdict is therefore read from what the runner says ran:
 *
 * - validated: at least one test ran and failed on base.
 * - flagged: the changed tests ran and passed on base.
 * - invalid: nothing tells us the tests ran. There were no results, a file failed to load, there
 * were no tests at all, or the run failed only in hooks or outside any test.
 *
 * A test that ran and failed counts whatever its error, a timeout included. Telling the intended
 * assertion apart from any other failure in the test body (docs/testing.md § Regression Tests) is
 * left to review; this gate only refuses runs in which no test failed at all.
 *
 * The exit code is 0 for validated, 10 for flagged, and 11 for invalid, so that a crash of this
 * script (exit 1) cannot be mistaken for either verdict.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const EXIT_CODES = { validated: 0, flagged: 10, invalid: 11 }

/** Matches the ANSI escape sequences the spec reporter colours its output with. */
const ANSI = /\u001b\[[0-9;]*m/g

/** First line of a message, for a one-line reason. */
const firstLine = message => message.trim().split('\n')[0]

/** Reads the Vitest JSON reporter's output (`--reporter=json --outputFile.json=…`). */
export const vitestVerdict = (results, exitCode) => {
  if (!results) return { verdict: 'invalid', reason: 'Vitest wrote no results, so no test ran.' }

  // A file-level message is an error outside any test, such as an import that does not resolve on base.
  const broken = results.testResults.filter(file => file.message)
  if (broken.length > 0) {
    return {
      verdict: 'invalid',
      reason: broken.map(file => `${file.name} failed to run: ${firstLine(file.message)}`).join('\n'),
    }
  }

  if (results.numFailedTests > 0) {
    return {
      verdict: 'validated',
      reason: `${results.numFailedTests} of ${results.numTotalTests} tests failed on base.`,
    }
  }

  const ran = results.numTotalTests - results.numPendingTests - results.numTodoTests
  if (ran === 0) return { verdict: 'invalid', reason: 'No test ran.' }

  // Every test passed, yet the run failed: an unhandled error or teardown failure outside the tests.
  if (exitCode !== 0) {
    return { verdict: 'invalid', reason: `All ${ran} tests passed, but the run exited ${exitCode} outside them.` }
  }

  return { verdict: 'flagged', reason: `All ${ran} tests passed on base.` }
}

/**
 * Reads the WebdriverIO spec reporter's output. The base commit's own WDIO config runs, so a reporter added
 * to it would be missing on older bases; the spec reporter is what every base has. It lists each test with
 * ✓ or ✖, and lists a failed hook with ✖ under a title such as `"before each" hook for "…"`.
 */
export const wdioVerdict = (log, exitCode) => {
  if (log === null) return { verdict: 'invalid', reason: 'The runner wrote no output, so no test ran.' }

  const results = log
    .replace(ANSI, '')
    .split('\n')
    .map(line => line.match(/([✓✖])\s+(.+?)(?:\s+»\s+\[.*\])?\s*$/u))
    .filter(match => match !== null)
    .map(([, symbol, title]) => ({
      passed: symbol === '✓',
      hook: /^"(before|after) (each|all)" hook/.test(title),
      title,
    }))

  const tests = results.filter(result => !result.hook)
  const failedTests = tests.filter(result => !result.passed)
  const failedHooks = results.filter(result => result.hook && !result.passed)

  if (exitCode === 0) {
    return tests.length > 0
      ? { verdict: 'flagged', reason: 'The changed tests passed on base.' }
      : { verdict: 'invalid', reason: 'The run succeeded without running a test.' }
  }

  if (failedTests.length > 0) {
    return { verdict: 'validated', reason: `${failedTests.length} test result(s) failed on base.` }
  }

  return {
    verdict: 'invalid',
    reason:
      failedHooks.length > 0
        ? `No test failed; the run failed in ${failedHooks.map(hook => hook.title).join(', ')}.`
        : `No test ran; the run exited ${exitCode} before reaching one, e.g. a configuration or session error.`,
  }
}

/** Reads the results file, or null when the runner did not write one. */
const read = file => (existsSync(file) ? readFileSync(file, 'utf8') : null)

/** Prints the verdict's reason for the given runner, results file, and exit code, and returns the verdict's exit code. */
const main = ([runner, file, exit]) => {
  const exitCode = Number(exit)
  if (runner !== 'vitest' && runner !== 'wdio') {
    console.error('usage: node scripts/ci/tdd-verdict.mjs <vitest|wdio> <results-file> <exit-code>')
    return 2
  }
  const results = read(file)
  const { verdict, reason } =
    runner === 'vitest' ? vitestVerdict(results && JSON.parse(results), exitCode) : wdioVerdict(results, exitCode)
  console.info(reason)
  return EXIT_CODES[verdict]
}

export default main

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)))
}
