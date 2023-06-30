import sleep from '../sleep'
import throttleReduce from '../throttleReduce'

/** Appends a value to the end of an array. */
const append = <T>(value: T, accum: T[]): T[] => [...accum, value]

it('synchronous: once on the leading edge and once on the trailing edge', async () => {
  let calls = 0
  let output: number[] = []

  /** Increment calls and append output values. */
  const f = (values: number[]) => {
    calls++
    output = [...output, ...values]
  }
  const g = throttleReduce<number, number[]>(f, append, [] as number[], 10)

  // eslint-disable-next-line fp/no-loops
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
  const g = throttleReduce<number, number[]>(f, append, [] as number[], 51)

  // Call the throttled function every 10 ms, completing in 100 ms.

  // The first call is immediately output (leading edge)
  g(0)
  expect(calls).toBe(1)
  expect(output).toEqual([0])
  await sleep(10)

  // The 2nd call is suppressed (10ms)
  g(1)
  expect(calls).toBe(1)
  expect(output).toEqual([0])
  await sleep(10)

  // The 3rd call is suppressed (30ms)
  g(2)
  expect(calls).toBe(1)
  expect(output).toEqual([0])
  await sleep(10)

  // The 4th call is suppressed (40ms)
  g(3)
  expect(calls).toBe(1)
  expect(output).toEqual([0])
  await sleep(10)

  // The 5th call is suppressed (40ms)
  g(4)
  expect(calls).toBe(1)
  expect(output).toEqual([0])
  await sleep(10)

  // The 6th call is triggered (50ms)
  g(5)
  expect(calls).toBe(2)
  expect(output).toEqual([0, 1, 2, 3, 4])
  await sleep(10)

  // The 7th call is suppressed (60ms)
  g(6)
  expect(calls).toBe(2)
  expect(output).toEqual([0, 1, 2, 3, 4])
  await sleep(10)

  // The 8th call is suppressed (70ms)
  g(7)
  expect(calls).toBe(2)
  expect(output).toEqual([0, 1, 2, 3, 4])
  await sleep(10)

  // The 9th call is suppressed (80ms)
  g(8)
  expect(calls).toBe(2)
  expect(output).toEqual([0, 1, 2, 3, 4])
  await sleep(10)

  // The 10th call is suppressed (90ms)
  g(9)
  expect(calls).toBe(2)
  expect(output).toEqual([0, 1, 2, 3, 4])
  await sleep(10)

  // The final call is triggered on the trailing edge (100ms)
  expect(calls).toBe(3)
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
  const g = throttleReduce<number, number[]>(f, append, [] as number[], 10)

  // eslint-disable-next-line fp/no-loops
  for (let i = 0; i < 10; i++) {
    g(i)
  }

  g.flush()

  // leading and trailing edge
  expect(calls).toBe(2)
  expect(output).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
})
