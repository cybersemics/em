import { delay } from '../../test-helpers/delay'
import taskQueue from '../taskQueue'

it('run async tasks', async () => {
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
  /** Delay. */
  const incDelayed = async () => delay(1)
  const output: { current: number; total: number }[] = []

  await new Promise<void>(resolve => {
    const queue = taskQueue({
      onStep: (current, total) => {
        // eslint-disable-next-line fp/no-mutating-methods
        output.push({ current, total })
      },
      onEnd: resolve,
    })

    queue.add([incDelayed, incDelayed, incDelayed])
  })

  expect(output).toEqual([
    { current: 1, total: 3 },
    { current: 2, total: 3 },
    { current: 3, total: 3 },
  ])
})
