import _, { debounce } from 'lodash'
import throttleReduce from '../util/throttleReduce'

const calls: string[] = []

// Module-scope wrappers, as the app's are. Vitest isolates modules per file, not per test, so each outlives every test
// in this file, and the pending trailing call it holds at the end of one test would fire in the next.
const throttled = _.throttle((value: string) => calls.push(value), 1000)
const debounced = debounce((value: string) => calls.push(value), 1000)
const reduced = throttleReduce(
  (values: string[]) => calls.push(values.join('')),
  (value: string, acc: string[]) => [...acc, value],
  [],
  1000,
)

// One fake clock for the whole file, so that a timer pending at the end of one test is still pending at the start of
// the next: switching to real timers between tests would discard it and hide the leak.
beforeAll(() => {
  vi.useFakeTimers()
})

afterAll(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  calls.length = 0
})

// These tests depend on their order: the first leaves trailing calls pending and a leading-edge window open, the
// second checks that neither reached it. Together they pin the lodash interception in setupTests.ts.
// https://github.com/cybersemics/em/issues/5257
describe('throttles are cancelled between tests', () => {
  it('leave trailing calls pending', () => {
    throttled('leading')
    throttled('trailing')
    debounced('debounced')
    reduced('r')
    expect(calls).toEqual(['leading', 'r'])
  })

  it('start with the leading-edge window closed', () => {
    throttled('fresh')
    expect(calls).toEqual(['fresh'])
  })

  it('never receive an earlier test’s trailing calls', () => {
    vi.advanceTimersByTime(2000)
    expect(calls).toEqual([])
  })
})
