/**
 * Tests for the verdict the TDD workflows draw from a run of changed tests on the pre-fix commit. The Vitest
 * fixtures are trimmed from real `--reporter=json` output; the WebdriverIO crash is the one quoted in #4744,
 * which every fork pull request reported as a validated red test.
 */
import { describe, expect, it } from 'vitest'
import { vitestVerdict, wdioVerdict } from '../tdd-verdict.mjs'

/** A Vitest JSON report with the given files, with the counts derived from them. */
const vitestReport = (
  files: { name: string; message?: string; tests?: ('passed' | 'failed' | 'pending' | 'todo')[] }[],
) => {
  const tests = files.flatMap(file => file.tests ?? [])
  return {
    numTotalTests: tests.length,
    numFailedTests: tests.filter(status => status === 'failed').length,
    numPendingTests: tests.filter(status => status === 'pending').length,
    numTodoTests: tests.filter(status => status === 'todo').length,
    testResults: files.map(file => ({
      name: file.name,
      message: file.message ?? '',
      assertionResults: (file.tests ?? []).map(status => ({ status })),
    })),
  }
}

describe('vitest', () => {
  it('validates a run in which a test failed', () => {
    const report = vitestReport([{ name: 'a.ts', tests: ['failed', 'passed'] }])
    expect(vitestVerdict(report, 1).verdict).toBe('validated')
  })

  it('flags a run in which every test passed', () => {
    const report = vitestReport([{ name: 'a.ts', tests: ['passed'] }])
    expect(vitestVerdict(report, 0).verdict).toBe('flagged')
  })

  it('rejects a file that failed to load, even beside a failing test', () => {
    const report = vitestReport([
      { name: 'a.ts', tests: ['failed'] },
      { name: 'b.ts', message: 'Failed to resolve import "../missing" from "b.ts". Does the file exist?' },
    ])
    expect(vitestVerdict(report, 1)).toEqual({
      verdict: 'invalid',
      reason: 'b.ts failed to run: Failed to resolve import "../missing" from "b.ts". Does the file exist?',
    })
  })

  it('rejects a run without results', () => {
    expect(vitestVerdict(null, 1).verdict).toBe('invalid')
  })

  it('rejects a run in which no test ran', () => {
    const report = vitestReport([{ name: 'a.ts', tests: ['pending', 'todo'] }])
    expect(vitestVerdict(report, 0).verdict).toBe('invalid')
  })

  it('rejects a run whose tests passed but which failed outside them', () => {
    const report = vitestReport([{ name: 'a.ts', tests: ['passed'] }])
    expect(vitestVerdict(report, 1).verdict).toBe('invalid')
  })
})

describe('wdio', () => {
  /** The spec reporter's report for one spec, with the given result lines. */
  const specReport = (lines: string[]) =>
    [
      '[0-0] » src/e2e/iOS/__tests__/gestures.ts',
      '[0-0] gestures',
      ...lines.map(line => `[0-0]    ${line}`),
      '',
      'Spec Files:\t 0 passed, 1 failed, 1 total (100% completed) in 00:02:11',
    ].join('\n')

  it('validates a run in which a test failed', () => {
    expect(wdioVerdict(specReport(['✓ setup works', '✖ joins two words']), 1).verdict).toBe('validated')
  })

  it('reads results through the colours the reporter adds', () => {
    expect(wdioVerdict(specReport(['\u001b[31m✖\u001b[39m joins two words']), 1).verdict).toBe('validated')
  })

  it('flags a run that passed', () => {
    expect(wdioVerdict(specReport(['✓ joins two words']), 0).verdict).toBe('flagged')
  })

  it('flags a run that passed on a retry, since the test can pass on base', () => {
    const log = [specReport(['✖ joins two words']), specReport(['✓ joins two words'])].join('\n')
    expect(wdioVerdict(log, 0).verdict).toBe('flagged')
  })

  it('rejects a run that failed only in a hook', () => {
    expect(wdioVerdict(specReport(['✖ "before each" hook for "joins two words"']), 1)).toEqual({
      verdict: 'invalid',
      reason: 'No test failed; the run failed in "before each" hook for "joins two words".',
    })
  })

  // https://github.com/cybersemics/em/issues/4744
  it('rejects a configuration crash before any test ran', () => {
    const log = [
      'BROWSERSTACK_USERNAME:',
      'BROWSERSTACK_ACCESS_KEY:',
      'ERROR @wdio/config:ConfigParser: Failed loading configuration file: wdio.browserstack.conf.ts: process.env.BROWSERSTACK_USERNAME not defined',
    ].join('\n')
    expect(wdioVerdict(log, 1).verdict).toBe('invalid')
  })

  it('rejects a run without output', () => {
    expect(wdioVerdict(null, 1).verdict).toBe('invalid')
  })

  it('rejects a successful run in which no test ran', () => {
    expect(wdioVerdict('Spec Files:\t 0 passed, 0 total', 0).verdict).toBe('invalid')
  })
})
