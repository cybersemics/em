import sleep from '../../util/sleep'
import series from '../series'

it('execute promise-returning functions serially', async () => {
  const called: number[] = []

  /** Generates an asynchronous task that pushes to called, delays, and returns. */
  const makeDelay = (n: number) => {
    called.push(n)
    return () => sleep(n).then(() => n)
  }

  const result = await series([makeDelay(100), makeDelay(200), makeDelay(10)])

  expect(called).toEqual([100, 200, 10])
  expect(result).toEqual([100, 200, 10])
})

it('do not concatenate result arrays', async () => {
  /** Generates an asynchronous task that pushes to called, delays, and returns. */
  const makeDelay = (x: [number]) => () => sleep(x[0]).then(() => x)

  const result = await series([makeDelay([100]), makeDelay([200]), makeDelay([10])])

  expect(result).toEqual([[100], [200], [10]])
})

it('ignore null', async () => {
  /** Takes a short nap then returns true. */
  const nap = () => sleep(1).then(() => true)

  const result = await series([nap, nap, null, nap])

  expect(result).toEqual([true, true, true])
})

it('ignore tasks that return null', async () => {
  /** Takes a short nap then returns true. */
  const nap = () => sleep(1).then(() => true)

  const result = await series([nap, nap, () => null, nap])

  expect(result).toEqual([true, true, true])
})
