import _ from 'lodash'
// Explicitly import test function from vitest to access retry option.
// Otherwise global jest types override vitest/globals.
import { describe } from 'vitest'
import sleep from '../sleep'
import throttleReduce from '../throttleReduce'

/** Appends a value to the end of an array. */
const append = <T>(value: T, accum: T[]): T[] => [...accum, value]

// Add a retry to all taskQueue tests since underlying throttleReduce intermittently fails.
// This occurs because small timing differences can cause the throttle to be triggered at different times.
describe('throttleReduce', { retry: 5 }, () => {
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

    await sleep(20)

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
    const g = throttleReduce<number, number[], void>(f, append, [] as number[], 101)

    // Call the throttled function every 10 ms, completing in 100 ms.

    // The 1st call is immediately output (leading edge)
    g(0)
    expect(calls).toBe(1)
    expect(output).toEqual([0])
    await sleep(20)

    // The 2nd call is suppressed (10ms)
    g(1)
    expect(calls).toBe(1)
    expect(output).toEqual([0])
    await sleep(20)

    // The 3rd call is suppressed (30ms)
    g(2)
    expect(calls).toBe(1)
    expect(output).toEqual([0])
    await sleep(20)

    // The 4th call is suppressed (40ms)
    g(3)
    expect(calls).toBe(1)
    expect(output).toEqual([0])
    await sleep(20)

    // The 5th call is suppressed (40ms)
    g(4)
    expect(calls).toBe(1)
    expect(output).toEqual([0])
    await sleep(20)

    // The 6th call is triggered (50ms)
    g(5)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(20)

    // The 7th call is suppressed (60ms)
    g(6)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(20)

    // The 8th call is suppressed (70ms)
    g(7)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(20)

    // The 9th call is suppressed (80ms)
    g(8)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(20)

    // The 10th call is suppressed (90ms)
    g(9)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(20)

    // The final call is triggered on the trailing edge (100ms)
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
    const g = throttleReduce<number, number[], void>(f, append, [] as number[], 500, { leading: false })

    // Call the throttled function every 100 ms, completing in 1000 ms.
    // NOTE: Sleeping less (e.g. 20ms) works locally but results in timing issues when run in the GitHub Action workflow.

    // The 1st call is suppressed
    g(0)
    expect(calls).toBe(0)
    expect(output).toEqual([])
    await sleep(100)

    // The 2nd call is suppressed (100ms)
    g(1)
    expect(calls).toBe(0)
    expect(output).toEqual([])
    await sleep(100)

    // The 3rd call is suppressed (200ms)
    g(2)
    expect(calls).toBe(0)
    expect(output).toEqual([])
    await sleep(100)

    // The 4th call is suppressed (300ms)
    g(3)
    expect(calls).toBe(0)
    expect(output).toEqual([])
    await sleep(100)

    // The 5th call is suppressed (400ms)
    g(4)
    expect(calls).toBe(0)
    expect(output).toEqual([])
    await sleep(100)

    // The 6th call is triggered (500ms)
    g(5)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(100)

    // The 7th call is suppressed (600ms)
    g(6)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(100)

    // The 8th call is suppressed (700ms)
    g(7)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(100)

    // The 9th call is suppressed (800ms)
    g(8)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(100)

    // The 10th call is suppressed (900ms)
    g(9)
    expect(calls).toBe(1)
    expect(output).toEqual([0, 1, 2, 3, 4])
    await sleep(100)

    // The final call is triggered on the trailing edge (100ms)
    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('flush', async () => {
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

  it('return function result from last from flush', async () => {
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

    await sleep(20)

    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
