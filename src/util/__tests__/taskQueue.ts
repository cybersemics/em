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

it('autostart: false', async () => {
  let counter = 0
  /** Increment counter. */
  const inc = () => counter++

  await new Promise<void>(resolve => {
    const queue = taskQueue({
      autostart: false,
      onEnd: resolve,
    })
    queue.add([inc, inc, inc])
    queue.add([inc, inc, inc])
    queue.start()
  })

  expect(counter).toBe(6)
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

it('pause', async () => {
  let counter = 0
  /** Increment counter after a delay. */
  const incDelayed = async () => {
    await delay(20)
    counter++
  }

  let queue: ReturnType<typeof taskQueue> = {} as any
  const done = new Promise<void>(resolve => {
    queue = taskQueue({ onEnd: resolve })
  })

  // add three tasks and pause midway through
  // expect counter to not be incremented because tasks are still in progress
  queue.add([incDelayed, incDelayed, incDelayed])
  await delay(10)
  queue.pause()
  expect(counter).toBe(0)

  // add three more tasks and resume
  // expect first three tasks to have completed after a delay
  queue.add([incDelayed, incDelayed, incDelayed])
  queue.start()
  await delay(10)
  expect(counter).toBe(3)

  await done
  expect(counter).toBe(6)
})
