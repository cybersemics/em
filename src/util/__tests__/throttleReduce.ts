import _ from 'lodash'
import throttleReduce from '../throttleReduce'

/** Appends a value to the end of an array. */
const append = <T>(value: T, accum: T[]): T[] => [...accum, value]

// These tests assert exactly which calls land in which throttle window. Under real timers that depends on how
// promptly the event loop gets around to each callback, which is not reliable at sub-100ms resolution on a CI
// runner - retries did not fix it and the suite was skipped. Driving a fake clock makes the window boundaries
// exact, so the assertions hold regardless of how loaded the machine is.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('throttleReduce', () => {
  it('synchronous: once on the leading edge and once on the trailing edge', async () => {
    let calls = 0
    let output: number[] = []

    /** Increment calls and append output values. */
    const f = (values: number[]) => {
      calls++
      output = [...output, ...values]
    }
    const g = throttleReduce<number, number[], void>(f, append, [] as number[], 10)
    for (let i = 0; i < 10; i++) {
      g(i)
    }

    await vi.advanceTimersByTimeAsync(10)

    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('asynchronous: once on the leading edge and once on the trailing edge', async () => {
    let calls = 0
    let output: number[] = []

    /** Increment calls and append output values. */
    const f = (values: number[]) => {
      calls++
      output = [...output, ...values]
    }
    const g = throttleReduce<number, number[], void>(f, append, [] as number[], 50)

    // Call the throttled function every 10 ms, completing in 100 ms.

    // The 1st call is immediately output (leading edge, 0ms)
    g(0)
    expect(calls).toBe(1)
    expect(output).toEqual([0])
    await vi.advanceTimersByTimeAsync(10)

    // The 2nd call is suppressed (10ms)
    g(1)
    expect(calls).toBe(1)
    expect(output).toEqual([0])
    await vi.advanceTimersByTimeAsync(10)

    // The 3rd call is suppressed (20ms)
    g(2)
    expect(calls).toBe(1)
    expect(output).toEqual([0])
    await vi.advanceTimersByTimeAsync(10)

    // The 4th call is suppressed (30ms)
    g(3)
    expect(calls).toBe(1)
    expect(output).toEqual([0])
    await vi.advanceTimersByTimeAsync(10)

    // The 5th call is suppressed (40ms)
    g(4)
    expect(calls).toBe(1)
    expect(output).toEqual([0])

    // The suppressed calls are output on the trailing edge of the first window (50ms)
    await vi.advanceTimersByTimeAsync(10)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])

    // The 6th call opens the second window and is suppressed (50ms)
    g(5)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await vi.advanceTimersByTimeAsync(10)

    // The 7th call is suppressed (60ms)
    g(6)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await vi.advanceTimersByTimeAsync(10)

    // The 8th call is suppressed (70ms)
    g(7)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await vi.advanceTimersByTimeAsync(10)

    // The 9th call is suppressed (80ms)
    g(8)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await vi.advanceTimersByTimeAsync(10)

    // The 10th call is suppressed (90ms)
    g(9)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])

    // The remaining calls are output on the trailing edge of the second window (100ms)
    await vi.advanceTimersByTimeAsync(10)
    expect(calls).toBe(3)
    expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('asynchronous: trailing edge only', async () => {
    let calls = 0
    let output: number[] = []

    /** Increment calls and append output values. */
    const f = (values: number[]) => {
      calls++
      output = [...output, ...values]
    }
    const g = throttleReduce<number, number[], void>(f, append, [] as number[], 50, { leading: false })

    // Call the throttled function every 10 ms, completing in 100 ms.

    // The 1st call is suppressed, since there is no leading edge (0ms)
    g(0)
    expect(calls).toBe(0)
    expect(output).toEqual([])
    await vi.advanceTimersByTimeAsync(10)

    // The 2nd call is suppressed (10ms)
    g(1)
    expect(calls).toBe(0)
    expect(output).toEqual([])
    await vi.advanceTimersByTimeAsync(10)

    // The 3rd call is suppressed (20ms)
    g(2)
    expect(calls).toBe(0)
    expect(output).toEqual([])
    await vi.advanceTimersByTimeAsync(10)

    // The 4th call is suppressed (30ms)
    g(3)
    expect(calls).toBe(0)
    expect(output).toEqual([])
    await vi.advanceTimersByTimeAsync(10)

    // The 5th call is suppressed (40ms)
    g(4)
    expect(calls).toBe(0)
    expect(output).toEqual([])

    // The suppressed calls are output on the trailing edge of the first window (50ms)
    await vi.advanceTimersByTimeAsync(10)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])

    // The 6th call opens the second window and is suppressed (50ms)
    g(5)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await vi.advanceTimersByTimeAsync(10)

    // The 7th call is suppressed (60ms)
    g(6)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await vi.advanceTimersByTimeAsync(10)

    // The 8th call is suppressed (70ms)
    g(7)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await vi.advanceTimersByTimeAsync(10)

    // The 9th call is suppressed (80ms)
    g(8)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await vi.advanceTimersByTimeAsync(10)

    // The 10th call is suppressed (90ms)
    g(9)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])

    // The remaining calls are output on the trailing edge of the second window (100ms)
    await vi.advanceTimersByTimeAsync(10)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('flush', () => {
    let calls = 0
    let output: number[] = []

    /** Increment calls and append output values. */
    const f = (values: number[]) => {
      calls++
      output = [...output, ...values]
    }
    const g = throttleReduce<number, number[], void>(f, append, [] as number[], 10)
    for (let i = 0; i < 10; i++) {
      g(i)
    }

    g.flush()

    // leading and trailing edge
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('return function result from last from flush', () => {
    /** Squares each item in an array. */
    const f = (values: number[]) => values.map(x => x * x)
    const g = throttleReduce<number, number[], number[]>(f, append, [] as number[], 10)
    for (let i = 0; i < 10; i++) {
      g(i)
    }

    // return flushed values
    expect(g.size()).toEqual(9)
    expect(g.flush()).toEqual([1, 4, 9, 16, 25, 36, 49, 64, 81])

    // return undefined when there is nothing to flush
    expect(g.size()).toEqual(0)
    expect(g.flush()).toEqual(undefined)
  })

  it('custom throttle function', async () => {
    let calls = 0
    let output: number[] = []

    /** Increment calls and append output values. */
    const f = (values: number[]) => {
      calls++
      output = [...output, ...values]
    }
    const g = throttleReduce<number, number[], void>(f, append, [] as number[], 10, { throttle: _.throttle })
    for (let i = 0; i < 10; i++) {
      g(i)
    }

    await vi.advanceTimersByTimeAsync(10)

    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
