/**
 * Decides what a TDD run on the base branch proves, from what the test runner actually reported.
 *
 * The TDD workflow runs a pull request's new tests against code without the fix and wants them to
 * fail. The exit code alone cannot say whether they did: a config that throws on a missing secret,
 * a test file that cannot be imported, a session that never opens, and a test that fails its own
 * assertion all exit nonzero (#4744). Only a test that executed and failed is evidence the test
 * covers the change, so that is the only thing reported as validated.
 *
 * Usage, from a TDD job step.
 *
 * ```sh
 * node .github/scripts/tdd-verdict.cjs --runner vitest --exit-code "$TEST_EXIT" \
 *   --report "$RUNNER_TEMP/tdd-report.json" --name unit --skip-label skip-tdd-unit
 * ```
 *
 * The verdict is written to `$GITHUB_OUTPUT` as `verdict=`, and the process exits 0 when validated,
 * 1 when flagged, and 2 when inconclusive.
 *
 * CommonJS so that the workflow can run it with plain `node` and the tests can `require` it, the way
 * scripts/ci does.
 */
const fs = require('node:fs')

/** Matches ANSI colour escapes, which wdio's reporter emits unless colour is disabled. */
const ANSI = /\u001b\[[0-9;]*m/g

/** Matches a count line of wdio's spec reporter, e.g. `[iPhone 15 Plus iOS 17 #0-0] 1 failing`. */
const WDIO_COUNT = /^(?:\[[^\]]*\]\s+)?(\d+) (passing|failing)\b/

/** The first line of a runner log that reports an error, quoted to say why a run was inconclusive. */
const ERROR_LINE = /\bERROR\b|\bError:/

/**
 * Reads what a vitest JSON report says about the run: how many tests executed and failed, and which
 * test files failed to load at all, which count as neither.
 */
const readVitestReport = report => {
  if (!report) return { error: 'vitest wrote no report, so it stopped before running any test file' }
  try {
    const { numPassedTests, numFailedTests, testResults } = JSON.parse(report)
    return {
      executed: numPassedTests + numFailedTests,
      failed: numFailedTests,
      // A file that fails on import has a failed status but no assertion results. Those tests never ran.
      unloadable: testResults
        .filter(file => file.status === 'failed' && (file.assertionResults || []).length === 0)
        .map(file => `${file.name}: ${(file.message || '').split('\n')[0]}`),
    }
  } catch {
    return { error: 'vitest wrote a report that is not valid JSON' }
  }
}

/**
 * Reads what a wdio log says about the run. The spec reporter prints `N passing` and `N failing`
 * once per spec attempt and prints nothing when no test ran, so the sums are zero for a config that
 * failed to load or a session that never opened.
 */
const readWdioLog = report => {
  const lines = report.replace(ANSI, '').split('\n')
  const counts = lines.map(line => WDIO_COUNT.exec(line.trim())).filter(Boolean)
  /** Totals the counts of one kind, `passing` or `failing`, across every spec attempt in the log. */
  const sum = kind => counts.filter(match => match[2] === kind).reduce((total, match) => total + Number(match[1]), 0)
  const failed = sum('failing')
  return {
    executed: sum('passing') + failed,
    failed,
    unloadable: [],
    firstError: lines.find(line => ERROR_LINE.test(line))?.trim(),
  }
}

/**
 * Classifies a TDD run on the base branch.
 *
 * The verdict is `validated` when tests executed and at least one failed, which is evidence the tests
 * cover the change. It is `flagged` when tests executed and none failed, so the tests do not catch
 * the problem. It is `inconclusive` when no test executed, or the run failed without a failing test:
 * nothing is proven either way, so it must never be reported as validated.
 *
 * The runner is `vitest` (its JSON report) or `wdio` (its log). A failing test is the evidence, not
 * the exit code, with one exception: a zero exit code with a failing test means a retry passed, and
 * what the base branch did on the final attempt is that it passed.
 */
const tddVerdict = ({ runner, exitCode, report }) => {
  const read = runner === 'vitest' ? readVitestReport(report) : readWdioLog(report)

  if (read.error) return { verdict: 'inconclusive', reason: read.error }

  const { executed, failed, unloadable, firstError } = read
  const unloadableNote = unloadable.length
    ? ` ${unloadable.length} test file(s) failed to load: ${unloadable.join('; ')}.`
    : ''

  if (exitCode === 0) {
    return executed > 0
      ? { verdict: 'flagged', reason: `${executed} test(s) executed and none failed.` }
      : {
          verdict: 'inconclusive',
          reason: `Exit code 0, but no test executed (skipped or not collected).${unloadableNote}`,
        }
  }

  return failed > 0
    ? {
        verdict: 'validated',
        reason: `${failed} test(s) failed on the base branch (exit code ${exitCode}).${unloadableNote}`,
      }
    : {
        verdict: 'inconclusive',
        reason:
          `Exit code ${exitCode}, but no test executed and failed — a configuration, setup, or infrastructure ` +
          `error, not a failing assertion.${unloadableNote}${firstError ? ` First error: ${firstError}` : ''}`,
      }
}

/** Prints the verdict for a job log, in the voice of the messages the workflow printed before. */
const describe = ({ verdict, reason }, { name, skipLabel }) =>
  ({
    validated: [`✅ TDD validated: changed ${name} tests FAIL on the base branch.`, reason],
    flagged: [
      `❌ TDD flagged: changed ${name} tests PASS on the base branch.`,
      reason,
      'New tests that accompany bug fixes are expected to FAIL on the base branch and PASS on the PR, demonstrating that the issue has been fixed. Please review your tests and make sure they fail on the base branch.',
      `If you are extending the test coverage over previously working behavior, add the 'skip-tdd' or '${skipLabel}' label to the PR to skip this workflow.`,
    ],
    inconclusive: [
      `❌ TDD could not validate: changed ${name} tests did not run to a failure on the base branch.`,
      reason,
      'A test only counts as validated when it executed and failed. Read the log above for the cause; if this is infrastructure, re-run the job.',
    ],
  })[verdict].join('\n')

/** Reads `--flag value` pairs from the command line into an object. */
const parseArgs = argv =>
  argv.reduce((args, arg, i) => (arg.startsWith('--') ? { ...args, [arg.slice(2)]: argv[i + 1] } : args), {})

/** Runs the script: classify the run, print the verdict, publish it as a step output, and exit with its code. */
const main = () => {
  const {
    runner,
    'exit-code': exitCode,
    report: reportPath,
    name,
    'skip-label': skipLabel,
  } = parseArgs(process.argv.slice(2))
  const report = reportPath && fs.existsSync(reportPath) ? fs.readFileSync(reportPath, 'utf8') : ''
  const result = tddVerdict({ runner, exitCode: Number(exitCode), report })

  console.info(describe(result, { name, skipLabel }))
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `verdict=${result.verdict}\n`)
  process.exit({ validated: 0, flagged: 1, inconclusive: 2 }[result.verdict])
}

if (require.main === module) main()

module.exports = tddVerdict
