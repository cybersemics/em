import sleep from '../../util/sleep'
import taskQueue from '../taskQueue'

it('run tasks', async () => {
  let counter = 0
  /** Increments the counter. */
  const inc = () => ++counter

  await taskQueue<number>({ tasks: [inc, inc, inc] }).end

  expect(counter).toBe(3)
})

it('add tasks after instantiation', async () => {
  let counter = 0
  /** Increments the counter. */
  const inc = () => ++counter

  await new Promise(resolve => {
    const queue = taskQueue<number>({ onEnd: resolve })
    queue.add([inc, inc, inc])
  })

  expect(counter).toBe(3)
})

it('onEnd should return total', async () => {
  let counter = 0
  /** Increments the counter. */
  const inc = () => ++counter

  const total = await taskQueue<number>({ tasks: [inc, inc, inc] }).end

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
  /** Increments the counter after a delay. */
  const incDelayed = async () => {
    await sleep(1)
    return ++counter
  }

  await taskQueue<number>({ tasks: [incDelayed, incDelayed, incDelayed] }).end

  expect(counter).toBe(3)
})

it('autostart:false should not start running tasks until start is called', async () => {
  let counter = 0
  /** Increments the counter. */
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

it('autostart:false should not start initial tasks', async () => {
  let counter = 0
  /** Increments the counter. */
  const inc = () => ++counter

  const queue = taskQueue<number>({ autostart: false, tasks: [inc, inc, inc] })
  expect(counter).toBe(0)

  queue.start()
  expect(counter).toBe(3)
})

it('autostart:false should be ignored after start is called', async () => {
  let counter = 0
  /** Increments the counter. */
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
    await sleep(n)
    return s
  }

  await taskQueue<string>({
    // eslint-disable-next-line fp/no-mutating-methods
    onStep: result => output.push(result),
    tasks: [delayedValue('a', 20), delayedValue('b', 30), delayedValue('c', 10)],
  }).end

  expect(output).toEqual([
    { completed: 1, total: 3, index: 2, value: 'c' },
    { completed: 2, total: 3, index: 0, value: 'a' },
    { completed: 3, total: 3, index: 1, value: 'b' },
  ])
})

it('onStep per batch', async () => {
  const output1: { completed: number; total: number; value: number }[] = []
  const output2: { completed: number; total: number; value: number }[] = []

  let counter = 0
  /** Increments the counter after a delay. */
  const incDelayed = async () => {
    await sleep(1)
    return ++counter
  }

  await new Promise(resolve => {
    const queue = taskQueue<number>({
      autostart: false,
      onEnd: resolve,
    })
    // eslint-disable-next-line fp/no-mutating-methods
    queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output1.push(result) })
    // eslint-disable-next-line fp/no-mutating-methods
    queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output2.push(result) })
    queue.start()
  })

  expect(output1).toEqual([
    { completed: 1, total: 6, value: 1 },
    { completed: 2, total: 6, value: 2 },
    { completed: 3, total: 6, value: 3 },
  ])

  expect(output2).toEqual([
    { completed: 4, total: 6, value: 4 },
    { completed: 5, total: 6, value: 5 },
    { completed: 6, total: 6, value: 6 },
  ])
})

it('reset completed and total after each batch completes', async () => {
  const output: { completed: number; total: number; index: number; value: number }[] = []
  let counter = 0
  /** Increments the counter. */
  const inc = () => ++counter

  const queue = taskQueue<number>({
    // eslint-disable-next-line fp/no-mutating-methods
    onStep: result => output.push(result),
  })
  queue.add([inc, inc])
  await sleep(10)
  queue.add([inc, inc, inc])
  await sleep(10)

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
    await sleep(n)
    return s
  }

  await taskQueue<string>({
    // eslint-disable-next-line fp/no-mutating-methods
    onLowStep: result => output.push(result),
    tasks: [delayedValue('a', 20), delayedValue('b', 30), delayedValue('c', 10)],
  }).end

  expect(output).toEqual([
    { completed: 2, total: 3, index: 0, value: 'a' },
    { completed: 3, total: 3, index: 1, value: 'b' },
    { completed: 3, total: 3, index: 2, value: 'c' },
  ])
})

it('pause', async () => {
  let counter = 0
  /** Increments the counter after a delay. */
  const incDelayed = async () => {
    await sleep(20)
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
  await sleep(10)
  queue.pause()
  expect(counter).toBe(0)

  // add three more tasks and resume
  // expect first three tasks to have completed after a delay
  queue.add([incDelayed, incDelayed, incDelayed])
  queue.start()
  await sleep(10)
  expect(counter).toBe(3)

  await done
  expect(counter).toBe(6)
})

it('falsey tasks should be ignored and not count towards total', async () => {
  let counter = 0
  let stepCounter = 0
  let lowStepCounter = 0
  /** Increments the counter. */
  const inc = () => ++counter

  const total = await taskQueue<number>({
    onStep: () => stepCounter++,
    onLowStep: () => lowStepCounter++,
    tasks: [inc, null, inc],
  }).end

  expect(total).toBe(2)
  expect(counter).toBe(2)
  expect(lowStepCounter).toBe(2)
  expect(stepCounter).toBe(2)
})

it('add should return a promise that resolves when all the added tasks have completed', async () => {
  let counter = 0
  /** Increments the counter after a delay. */
  const incDelayed = async () => {
    await sleep(20)
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

it('completed', async () => {
  const completed: number[] = []
  /** Increments the counter after a delay. */
  const incDelayed = async () => {
    await sleep(1)
    // eslint-disable-next-line fp/no-mutating-methods
    completed.push(queue.completed())
  }

  const queue = taskQueue({ tasks: [incDelayed, incDelayed, incDelayed] })
  await queue.end

  expect(completed).toEqual([0, 1, 2])
})

it('running', async () => {
  const running: number[] = []
  /** Increments the counter after a delay. */
  const incDelayed = async () => {
    await sleep(1)
    // eslint-disable-next-line fp/no-mutating-methods
    running.push(queue.running())
  }

  const queue = taskQueue({ tasks: [incDelayed, incDelayed, incDelayed] })
  await queue.end

  expect(running).toEqual([3, 2, 1])
})

it('total', async () => {
  const total: number[] = []
  /** Increments the counter after a delay. */
  const incDelayed = async () => {
    await sleep(1)
    // eslint-disable-next-line fp/no-mutating-methods
    total.push(queue.total())
  }

  const queue = taskQueue({ tasks: [incDelayed, incDelayed, incDelayed] })
  await queue.end

  expect(total).toEqual([3, 3, 3])
})

it('clear', async () => {
  let counter = 0

  /** Increments the counter. */
  const inc = () => ++counter

  const queue = taskQueue<number>({ autostart: false, tasks: [inc, inc, inc] })
  queue.add([inc, inc, inc])
  queue.clear()
  queue.start()

  expect(counter).toBe(0)
})

it('retry once', async () => {
  const outputStep: { completed: number; total: number; index: number; value: string }[] = []
  const outputLowStep: { completed: number; total: number; index: number; value: string }[] = []
  let attempts = 0

  /** Returns a task that returns a value after a given number of milliseconds. */
  const delayedValueTimeout = (s: string, n: number, forceTimeout?: number) => async () => {
    if (forceTimeout && attempts < forceTimeout) {
      attempts++
      await sleep(999999)
    }
    await sleep(n)
    return s
  }

  await taskQueue<string>({
    // eslint-disable-next-line fp/no-mutating-methods
    onStep: result => outputStep.push(result),
    // eslint-disable-next-line fp/no-mutating-methods
    onLowStep: result => outputLowStep.push(result),
    retries: 2,
    timeout: 50,
    tasks: [delayedValueTimeout('a', 10), delayedValueTimeout('b', 20, 1), delayedValueTimeout('c', 30)],
  }).end

  expect(attempts).toEqual(1)

  expect(outputStep).toEqual([
    { completed: 1, total: 3, index: 0, value: 'a' },
    { completed: 2, total: 3, index: 2, value: 'c' },
    { completed: 3, total: 3, index: 1, value: 'b' },
  ])

  expect(outputLowStep).toEqual([
    { completed: 1, total: 3, index: 0, value: 'a' },
    { completed: 3, total: 3, index: 1, value: 'b' },
    { completed: 3, total: 3, index: 2, value: 'c' },
  ])
})

it('retry many', async () => {
  const outputStep: { completed: number; total: number; index: number; value: string }[] = []
  const outputLowStep: { completed: number; total: number; index: number; value: string }[] = []
  let attempts = 0

  /** Returns a task that returns a value after a given number of milliseconds. */
  const delayedValueTimeout = (s: string, n: number) => async () => {
    // hangs 10% of the time
    if (Math.random() > 0.1) {
      attempts++
      await sleep(999999)
    }
    await sleep(n)
    return s
  }

  await taskQueue<string>({
    // eslint-disable-next-line fp/no-mutating-methods
    onStep: result => outputStep.push(result),
    // eslint-disable-next-line fp/no-mutating-methods
    onLowStep: result => outputLowStep.push(result),
    retries: 999,
    timeout: 1,
    tasks: [delayedValueTimeout('a', 0), delayedValueTimeout('b', 0), delayedValueTimeout('c', 0)],
  }).end

  expect(attempts).toBeGreaterThan(1)
})

it('retry exceeds timeout', async () => {
  const outputStep: { completed: number; total: number; index: number; value: string }[] = []
  const outputLowStep: { completed: number; total: number; index: number; value: string }[] = []
  let attempts = 0

  /** Returns a task that returns a value after a given number of milliseconds. */
  const delayedValueTimeout = (s: string, n: number, forceTimeout?: number) => async () => {
    if (forceTimeout && attempts < forceTimeout) {
      attempts++
      await sleep(999999)
    }
    await sleep(n)
    return s
  }

  const queue = await taskQueue<string>({
    // eslint-disable-next-line fp/no-mutating-methods
    onStep: result => outputStep.push(result),
    // eslint-disable-next-line fp/no-mutating-methods
    onLowStep: result => outputLowStep.push(result),
    retries: 2,
    timeout: 50,
    tasks: [delayedValueTimeout('a', 10), delayedValueTimeout('b', 20, 999), delayedValueTimeout('c', 30)],
  })

  const errorMessage = await queue.end.catch(e => e.message)

  expect(errorMessage).toBe('Task timed out and retries exceeded.')

  expect(attempts).toEqual(3)

  expect(outputStep).toEqual([
    { completed: 1, total: 3, index: 0, value: 'a' },
    { completed: 2, total: 3, index: 2, value: 'c' },
  ])

  expect(outputLowStep).toEqual([{ completed: 1, total: 3, index: 0, value: 'a' }])
})
