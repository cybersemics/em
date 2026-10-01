import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const tddVerdict = require('../tdd-verdict.cjs')
const script = join(import.meta.dirname, '..', 'tdd-verdict.cjs')

/** Builds a vitest JSON report in the shape `--reporter=json` writes, from the files it ran. */
const vitestReport = files =>
  JSON.stringify({
    numPassedTests: files.flatMap(f => f.tests ?? []).filter(status => status === 'passed').length,
    numFailedTests: files.flatMap(f => f.tests ?? []).filter(status => status === 'failed').length,
    testResults: files.map(({ name, tests = [], message = '' }) => ({
      name: `/repo/${name}`,
      status: tests.includes('failed') || (tests.length === 0 && message) ? 'failed' : 'passed',
      message,
      assertionResults: tests.map(status => ({ status })),
    })),
  })

/** The log wdio printed for the crash in #4744: the config threw before any worker started. */
const wdioConfigCrash = [
  'BROWSERSTACK_USERNAME:',
  'BROWSERSTACK_ACCESS_KEY:',
  'ERROR @wdio/config:ConfigParser: Failed loading configuration file: .../wdio.browserstack.conf.ts: process.env.BROWSERSTACK_USERNAME not defined',
].join('\n')

/** Verifies a test that executed and failed on base is the only thing reported as validated. */
const testValidatedByFailingTest = () => {
  const { verdict } = tddVerdict({
    runner: 'vitest',
    exitCode: 1,
    report: vitestReport([{ name: 'a.ts', tests: ['failed'] }]),
  })
  assert.equal(verdict, 'validated')
}

/** Verifies tests that all pass on base are flagged, which is the failure the check exists to catch. */
const testFlaggedWhenTestsPass = () => {
  const { verdict } = tddVerdict({
    runner: 'vitest',
    exitCode: 0,
    report: vitestReport([{ name: 'a.ts', tests: ['passed'] }]),
  })
  assert.equal(verdict, 'flagged')
}

/** Verifies a nonzero exit with no failed test, such as an unresolvable import, is not validation (#4744). */
const testUnloadableFileIsInconclusive = () => {
  const { verdict, reason } = tddVerdict({
    runner: 'vitest',
    exitCode: 1,
    report: vitestReport([{ name: 'a.ts', message: "Cannot find module './missing.ts' imported" }]),
  })
  assert.equal(verdict, 'inconclusive')
  assert.match(reason, /failed to load/)
  assert.match(reason, /Cannot find module/)
}

/** Verifies a failing test still validates when another file fails to load, and says so. */
const testUnloadableFileDoesNotHideFailingTest = () => {
  const { verdict, reason } = tddVerdict({
    runner: 'vitest',
    exitCode: 1,
    report: vitestReport([
      { name: 'a.ts', tests: ['failed'] },
      { name: 'b.ts', message: 'Cannot find module' },
    ]),
  })
  assert.equal(verdict, 'validated')
  assert.match(reason, /1 test file\(s\) failed to load/)
}

/** Verifies a run that executed nothing proves nothing, whether it exited 0 or not. */
const testNothingExecutedIsInconclusive = () => {
  const skipped = JSON.stringify({
    numPassedTests: 0,
    numFailedTests: 0,
    testResults: [{ status: 'passed', assertionResults: [{ status: 'skipped' }] }],
  })
  assert.equal(tddVerdict({ runner: 'vitest', exitCode: 0, report: skipped }).verdict, 'inconclusive')
  assert.equal(tddVerdict({ runner: 'vitest', exitCode: 1, report: vitestReport([]) }).verdict, 'inconclusive')
}

/** Verifies a missing or corrupt report is inconclusive rather than an error in the verdict itself. */
const testUnreadableReportIsInconclusive = () => {
  assert.match(tddVerdict({ runner: 'vitest', exitCode: 1, report: '' }).reason, /no report/)
  assert.match(tddVerdict({ runner: 'vitest', exitCode: 1, report: '{not json' }).reason, /not valid JSON/)
}

/** Verifies the config crash from the issue is inconclusive and names its cause. */
const testWdioConfigCrashIsInconclusive = () => {
  const { verdict, reason } = tddVerdict({ runner: 'wdio', exitCode: 1, report: wdioConfigCrash })
  assert.equal(verdict, 'inconclusive')
  assert.match(reason, /BROWSERSTACK_USERNAME not defined/)
}

/** Verifies a failing wdio test is validated through the colour codes and device preface the reporter adds. */
const testWdioFailingTestIsValidated = () => {
  const report = [
    '[iPhone 15 Plus iOS 17 #0-0] \u001b[0m\u001b[0m',
    '[iPhone 15 Plus iOS 17 #0-0] \u001b[31m1 failing (12.3s)\u001b[39m',
    '[iPhone 15 Plus iOS 17 #0-0] 1) gestures keeps native text selection active',
    'Spec Files:\t 0 passed, 1 failed, 1 total (100% completed) in 00:00:49',
  ].join('\n')
  assert.equal(tddVerdict({ runner: 'wdio', exitCode: 1, report }).verdict, 'validated')
}

/** Verifies a spec that failed and then passed on retry is flagged, since the final attempt passed. */
const testWdioRetryThatPassesIsFlagged = () => {
  const report = ['[#0-0] 1 failing (9s)', '[#0-0] 1 passing (8s)'].join('\n')
  assert.equal(tddVerdict({ runner: 'wdio', exitCode: 0, report }).verdict, 'flagged')
}

/** Verifies a session that never opened, and a run that printed no counts at all, are inconclusive. */
const testWdioWithoutCountsIsInconclusive = () => {
  const sessionFailure = '[#0-0] ✖ Failed to create a session:\n[#0-0] WebDriverError: aborted due to timeout'
  assert.equal(tddVerdict({ runner: 'wdio', exitCode: 1, report: sessionFailure }).verdict, 'inconclusive')
  assert.equal(tddVerdict({ runner: 'wdio', exitCode: 0, report: '' }).verdict, 'inconclusive')
}

/** Verifies the command line contract the workflow depends on: exit code, step output, and printed message. */
const testCommandLine = () => {
  const dir = mkdtempSync(join(tmpdir(), 'tdd-verdict-'))
  /** Runs the script on a report and exit code, returning its exit status, printed message, and step output. */
  const run = ({ report, exitCode }) => {
    const reportPath = join(dir, 'report.json')
    const output = join(dir, 'output')
    writeFileSync(reportPath, report)
    writeFileSync(output, '')
    const result = spawnSync(
      process.execPath,
      [
        script,
        '--runner',
        'vitest',
        '--exit-code',
        String(exitCode),
        '--report',
        reportPath,
        '--name',
        'puppeteer',
        '--skip-label',
        'skip-tdd-puppeteer',
      ],
      { encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: output } },
    )
    return { status: result.status, stdout: result.stdout, output: readFileSync(output, 'utf8') }
  }

  const validated = run({ exitCode: 1, report: vitestReport([{ name: 'a.ts', tests: ['failed'] }]) })
  assert.deepEqual([validated.status, validated.output], [0, 'verdict=validated\n'])

  const flagged = run({ exitCode: 0, report: vitestReport([{ name: 'a.ts', tests: ['passed'] }]) })
  assert.deepEqual([flagged.status, flagged.output], [1, 'verdict=flagged\n'])
  // The hint names the label for the job that ran, not another job's.
  assert.match(flagged.stdout, /'skip-tdd' or 'skip-tdd-puppeteer'/)

  const inconclusive = run({ exitCode: 1, report: vitestReport([]) })
  assert.deepEqual([inconclusive.status, inconclusive.output], [2, 'verdict=inconclusive\n'])
}

testValidatedByFailingTest()
testFlaggedWhenTestsPass()
testUnloadableFileIsInconclusive()
testUnloadableFileDoesNotHideFailingTest()
testNothingExecutedIsInconclusive()
testUnreadableReportIsInconclusive()
testWdioConfigCrashIsInconclusive()
testWdioFailingTestIsValidated()
testWdioRetryThatPassesIsFlagged()
testWdioWithoutCountsIsInconclusive()
testCommandLine()

console.info('PASS: tdd-verdict')
