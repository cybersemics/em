import { delay } from '../../test-helpers/delay'
import taskQueue from '../taskQueue'

it('add single task', async () => {
  let counter = 0
  /** Increment counter. */
  const inc = () => counter++

  await new Promise<void>(resolve => {
    const queue = taskQueue({ onEnd: resolve })
    queue.add(inc)
  })

  expect(counter).toBe(1)
})

it('add multiple tasks', async () => {
  let counter = 0
  /** Increment counter. */
  const inc = () => counter++

  await new Promise<void>(resolve => {
    const queue = taskQueue({ onEnd: resolve })
    queue.add([inc, inc, inc])
  })

  expect(counter).toBe(3)
})

it('async tasks', async () => {
  let counter = 0
  /** Increment counter after a delay. */
  const incDelayed = async () => {
    await delay(1)
    counter++
  }

  await new Promise<void>(resolve => {
    const queue = taskQueue({ onEnd: resolve })
    queue.add([incDelayed, incDelayed, incDelayed])
  })

  expect(counter).toBe(3)
})

it('onStep', async () => {
  let counter = 0
  /** Increment counter. */
  const inc = () => counter++
  const output: { current: number; total: number }[] = []

  await new Promise<void>(resolve => {
    const queue = taskQueue({
      onStep: (current, total) => {
        // eslint-disable-next-line fp/no-mutating-methods
        output.push({ current, total })
      },
      onEnd: resolve,
    })

    queue.add([inc, inc, inc])
  })

  expect(output).toEqual([
    { current: 0, total: 3 },
    { current: 1, total: 3 },
    { current: 2, total: 3 },
  ])
})
