import _ from 'lodash'
import sleep from '../sleep'
import throttleConcat from '../throttleConcat'

it('synchronous: once on the leading edge and once on the trailing edge', async () => {
  let calls = 0
  let output: number[] = []

  /** Increment count and append output values. */
  const f = (values: number[]) => {
    calls++
    output = [...output, ...values]
  }
  const g = throttleConcat(f, 10)

  // eslint-disable-next-line fp/no-loops
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

  // eslint-disable-next-line fp/no-loops
  for (let i = 0; i < 10; i++) {
    g(i)
  }

  await sleep(20)

  expect(calls).toBe(2)
  expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
})
