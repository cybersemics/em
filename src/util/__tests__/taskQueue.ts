import { delay } from '../../test-helpers/delay'
import taskQueue from '../taskQueue'

it('add single task', async () => {
  let counter = 0
  /** Increment counter. */
  const inc = () => ++counter

  await new Promise(resolve => {
    const queue = taskQueue<number>({ onEnd: resolve })
    queue.add(inc)
  })

  expect(counter).toBe(1)
})

it('add multiple tasks', async () => {
  let counter = 0
  /** Increment counter. */
  const inc = () => ++counter

  await new Promise(resolve => {
    const queue = taskQueue<number>({ onEnd: resolve })
    queue.add([inc, inc, inc])
  })

  expect(counter).toBe(3)
})

it('onEnd should return total', async () => {
  let counter = 0
  /** Increment counter. */
  const inc = () => ++counter

  const total = await new Promise(resolve => {
    const queue = taskQueue<number>({ onEnd: resolve })
    queue.add([inc, inc, inc])
  })

  expect(total).toBe(3)
})

it('onEnd with no tasks', async () => {
  const total = await new Promise(resolve => {
    const queue = taskQueue<number>({ onEnd: resolve })
    queue.add([])
  })

  expect(total).toBe(0)
})

it('async tasks', async () => {
  let counter = 0
  /** Increment counter after a delay. */
  const incDelayed = async () => {
    await delay(1)
    return ++counter
  }

  await new Promise(resolve => {
    const queue = taskQueue<number>({ onEnd: resolve })
    queue.add([incDelayed, incDelayed, incDelayed])
  })

  expect(counter).toBe(3)
})

it('autostart:false should not start running tasks until start is called', async () => {
  let counter = 0
  /** Increment counter. */
  const inc = () => ++counter

  await new Promise(resolve => {
    const queue = taskQueue<number>({
      autostart: false,
      onEnd: resolve,
    })
    queue.add([inc, inc, inc])
    queue.add([inc, inc, inc])
    queue.start()
  })

  expect(counter).toBe(6)
})

it('autostart:false should be ignored after start is called', async () => {
  let counter = 0
  /** Increment counter. */
  const inc = () => ++counter

  const queue = taskQueue<number>({ autostart: false })
  queue.add([inc, inc, inc])
  queue.start()
  queue.add([inc, inc, inc])

  expect(counter).toBe(6)
})

it('onStep', async () => {
  const output: { completed: number; total: number; index: number; value: string }[] = []

  /** Returns a task that returns a value after a given number of milliseconds. */
  const delayedValue = (s: string, n: number) => async () => {
    await delay(n)
    return s
  }

  await new Promise(resolve => {
    const queue = taskQueue<string>({
      onStep: ({ completed, total, index, value }) => {
        // eslint-disable-next-line fp/no-mutating-methods
        output.push({ completed, total, index, value })
      },
      onEnd: resolve,
    })

    queue.add([delayedValue('a', 20), delayedValue('b', 30), delayedValue('c', 10)])
  })

  expect(output).toEqual([
    { completed: 1, total: 3, index: 2, value: 'c' },
    { completed: 2, total: 3, index: 0, value: 'a' },
    { completed: 3, total: 3, index: 1, value: 'b' },
  ])
})

it('reset completed and total after each batch completes', async () => {
  const output: { completed: number; total: number; index: number; value: number }[] = []
  let counter = 0
  /** Increment counter. */
  const inc = () => ++counter

  const queue = taskQueue<number>({
    onStep: ({ completed, total, index, value }) => {
      // eslint-disable-next-line fp/no-mutating-methods
      output.push({ completed, total, index, value })
    },
  })
  queue.add([inc, inc])
  await delay(10)
  queue.add([inc, inc, inc])
  await delay(10)

  expect(output).toEqual([
    { completed: 1, total: 2, index: 0, value: 1 },
    { completed: 2, total: 2, index: 1, value: 2 },
    { completed: 1, total: 3, index: 2, value: 3 },
    { completed: 2, total: 3, index: 3, value: 4 },
    { completed: 3, total: 3, index: 4, value: 5 },
  ])
})

it('onLowStep', async () => {
  const output: { completed: number; total: number; index: number; value: string }[] = []

  /** Returns a task that returns a value after a given number of milliseconds. */
  const delayedValue = (s: string, n: number) => async () => {
    await delay(n)
    return s
  }

  await new Promise(resolve => {
    const queue = taskQueue<string>({
      onLowStep: ({ completed, total, index, value }) => {
        // eslint-disable-next-line fp/no-mutating-methods
        output.push({ completed, total, index, value })
      },
      onEnd: resolve,
    })

    queue.add([delayedValue('a', 20), delayedValue('b', 30), delayedValue('c', 10)])
  })

  expect(output).toEqual([
    { completed: 2, total: 3, index: 0, value: 'a' },
    { completed: 3, total: 3, index: 1, value: 'b' },
    { completed: 3, total: 3, index: 2, value: 'c' },
  ])
})

it('pause', async () => {
  let counter = 0
  /** Increment counter after a delay. */
  const incDelayed = async () => {
    await delay(20)
    return ++counter
  }

  /** Wrap taskQueue for typing. */
  const makeTaskQueue = () => taskQueue<number>()
  let queue: ReturnType<typeof makeTaskQueue> = {} as any
  const done = new Promise(resolve => {
    queue = taskQueue<number>({ onEnd: resolve })
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

it('falsey tasks should be ignored and not count towards total', async () => {
  let counter = 0
  let stepCounter = 0
  let lowStepCounter = 0
  /** Increment counter. */
  const inc = () => ++counter

  const total = await new Promise(resolve => {
    const queue = taskQueue<number>({ onStep: () => stepCounter++, onLowStep: () => lowStepCounter++, onEnd: resolve })
    queue.add([inc, null, inc])
  })

  expect(total).toBe(2)
  expect(counter).toBe(2)
  expect(lowStepCounter).toBe(2)
  expect(stepCounter).toBe(2)
})

it('add should return a promise that resolves when all the added tasks have completed', async () => {
  let counter = 0
  /** Increment counter after a delay. */
  const incDelayed = async () => {
    await delay(20)
    return ++counter
  }

  const queue = taskQueue<number>()

  const results1 = await queue.add([incDelayed, incDelayed, incDelayed])
  expect(counter).toBe(3)
  expect(results1).toEqual([1, 2, 3])
  const results2 = await queue.add([incDelayed, incDelayed, incDelayed])
  expect(counter).toBe(6)
  expect(results2).toEqual([4, 5, 6])
})
