import _ from 'lodash'
// Explicitly import test function from vitest to access retry option.
// Otherwise global jest types override vitest/globals.
import { describe } from 'vitest'
import sleep from '../sleep'
import throttleConcat from '../throttleConcat'

// See throttleReduce comment for why tests are skipped.
describe.skip('throttleConcat', { retry: 10 }, () => {
  it('synchronous: once on the leading edge and once on the trailing edge', async () => {
    let calls = 0
    let output: number[] = []

    /** Increment count and append output values. */
    const f = (values: number[]) => {
      calls++
      output = [...output, ...values]
    }
    const g = throttleConcat(f, 10)
    for (let i = 0; i < 10; i++) {
      g(i)
    }

    await sleep(20)

    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('custom throttle function', async () => {
    let calls = 0
    let output: number[] = []

    /** Increment count and append output values. */
    const f = (values: number[]) => {
      calls++
      output = [...output, ...values]
    }
    const g = throttleConcat(f, 10, { throttle: _.throttle })
    for (let i = 0; i < 10; i++) {
      g(i)
    }

    await sleep(20)

    expect(calls).toBe(2)
    expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
