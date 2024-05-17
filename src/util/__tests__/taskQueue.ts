// Explicitly import test function from vitest to access retry option.
// Otherwise global jest types override vitest/globals.
import { describe } from 'vitest'
import sleep from '../../util/sleep'
import taskQueue from '../taskQueue'

// Add a retry to all taskQueue tests since underlying throttleReduce intermittently fails.
// This occurs because small timing differences can cause the throttle to be triggered at different times.
describe('taskQueue', { retry: 5 }, () => {
  it('run tasks', async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    await taskQueue<number>({ tasks: [inc, inc, inc] }).end

    expect(counter).toBe(3)
  })

  it('add a single task after instantiation', async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    await new Promise(resolve => {
      const queue = taskQueue<number>({ onEnd: resolve })
      queue.add(inc)
    })

    expect(counter).toBe(1)
  })

  it('add multiple tasks after instantiation', async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    await new Promise(resolve => {
      const queue = taskQueue<number>({ onEnd: resolve })
      queue.add([inc, inc, inc])
    })

    expect(counter).toBe(3)
  })

  it('add tasks with descriptions for debugging', async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    await new Promise(resolve => {
      const queue = taskQueue<number>({ onEnd: resolve })
      queue.add([
        {
          function: inc,
          description: 'task1',
        },
        {
          function: inc,
          description: 'task2',
        },
        {
          function: inc,
          description: 'task3',
        },
      ])
    })

    expect(counter).toBe(3)
  })

  it('end should resolve to total', async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    const total = await taskQueue<number>({ tasks: [inc, inc, inc] }).end

    expect(total).toBe(3)
  })

  it(`on('step', ...) syntax`, async () => {
    const output: { completed: number; expected: number | null; total: number; index: number; value: string }[] = []

    /** Returns a task that returns a value after a given number of milliseconds. */
    const delayedValue = (s: string, n: number) => async () => {
      await sleep(n)
      return s
    }

    const queue = taskQueue<string>({ paused: true })
    queue.on('step', result => output.push(result))
    queue.add([delayedValue('a', 20), delayedValue('b', 30), delayedValue('c', 10)])
    queue.start()
    await queue.end

    expect(output).toEqual([
      { completed: 1, expected: null, total: 3, index: 2, value: 'c' },
      { completed: 2, expected: null, total: 3, index: 0, value: 'a' },
      { completed: 3, expected: null, total: 3, index: 1, value: 'b' },
    ])
  })

  it(`on('lowStep', ...) syntax`, async () => {
    const output: { completed: number; expected: number | null; total: number; index: number; value: string }[] = []

    /** Returns a task that returns a value after a given number of milliseconds. */
    const delayedValue = (s: string, n: number) => async () => {
      await sleep(n)
      return s
    }

    const queue = taskQueue<string>({ paused: true })
    queue.on('lowStep', result => output.push(result))
    queue.add([delayedValue('a', 20), delayedValue('b', 30), delayedValue('c', 10)])
    queue.start()
    await queue.end

    expect(output).toEqual([
      { completed: 2, expected: null, total: 3, index: 0, value: 'a' },
      { completed: 3, expected: null, total: 3, index: 1, value: 'b' },
      { completed: 3, expected: null, total: 3, index: 2, value: 'c' },
    ])
  })

  it(`on('end', ...) syntax`, async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    await new Promise<number>(resolve => {
      const queue = taskQueue<number>()
      queue.on('end', resolve as (n: number) => void)
      queue.add([inc, inc, inc])
    })

    expect(counter).toBe(3)
  })

  it(`once('end', ...) promise`, async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    const queue = taskQueue<number>()
    const p = queue.once('end')
    queue.add([inc, inc, inc])
    const total = await p

    expect(total).toEqual(3)
    expect(counter).toBe(3)
  })

  it('trigger end when adding an empty task list', async () => {
    const total = await new Promise(resolve => {
      const queue = taskQueue<number>({ onEnd: resolve })
      queue.add([])
    })

    expect(total).toBe(0)
  })

  it('async tasks', async () => {
    let counter = 0
    /** Increments the counter after a delay. */
    const incDelayed = () => sleep(0).then(() => ++counter)

    await taskQueue<number>({ tasks: [incDelayed, incDelayed, incDelayed] }).end

    expect(counter).toBe(3)
  })

  it('paused: true should not start running tasks until start is called', async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    await new Promise(resolve => {
      const queue = taskQueue<number>({
        paused: true,
        onEnd: resolve,
      })
      queue.add([inc, inc, inc])
      queue.add([inc, inc, inc])
      queue.start()
    })

    expect(counter).toBe(6)
  })

  it('paused: true should not start initial tasks', async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    const queue = taskQueue<number>({ paused: true, tasks: [inc, inc, inc] })
    expect(counter).toBe(0)

    queue.start()
    expect(counter).toBe(3)
  })

  it('paused: true should be ignored after start is called', async () => {
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    const queue = taskQueue<number>({ paused: true })
    queue.add([inc, inc, inc])
    queue.start()
    queue.add([inc, inc, inc])

    expect(counter).toBe(6)
  })

  it('onStep', async () => {
    const output: { completed: number; expected: number | null; total: number; index: number; value: string }[] = []

    /** Returns a task that returns a value after a given number of milliseconds. */
    const delayedValue = (s: string, n: number) => async () => {
      await sleep(n)
      return s
    }

    await taskQueue<string>({
      onStep: result => output.push(result),
      tasks: [delayedValue('a', 20), delayedValue('b', 30), delayedValue('c', 10)],
    }).end

    expect(output).toEqual([
      { completed: 1, expected: null, total: 3, index: 2, value: 'c' },
      { completed: 2, expected: null, total: 3, index: 0, value: 'a' },
      { completed: 3, expected: null, total: 3, index: 1, value: 'b' },
    ])
  })

  it('onStep per batch', async () => {
    const output1: { completed: number; expected: number | null; total: number; value: number }[] = []
    const output2: { completed: number; expected: number | null; total: number; value: number }[] = []

    let counter = 0
    /** Increments the counter after a delay. */
    const incDelayed = () => sleep(0).then(() => ++counter)

    await new Promise(resolve => {
      const queue = taskQueue<number>({
        paused: true,
        onEnd: resolve,
      })
      queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output1.push(result) })
      queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output2.push(result) })
      queue.start()
    })

    expect(output1).toEqual([
      { completed: 1, expected: null, total: 6, value: 1 },
      { completed: 2, expected: null, total: 6, value: 2 },
      { completed: 3, expected: null, total: 6, value: 3 },
    ])

    expect(output2).toEqual([
      { completed: 4, expected: null, total: 6, value: 4 },
      { completed: 5, expected: null, total: 6, value: 5 },
      { completed: 6, expected: null, total: 6, value: 6 },
    ])
  })

  it('restart step completed and total each end', async () => {
    const output: { completed: number; expected: number | null; total: number; value: number }[] = []

    let counter = 0
    /** Increments the counter after a delay. */
    const incDelayed = () => sleep(0).then(() => ++counter)

    const queue = taskQueue<number>()
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })

    expect(output).toEqual([
      { completed: 1, expected: null, total: 3, value: 1 },
      { completed: 2, expected: null, total: 3, value: 2 },
      { completed: 3, expected: null, total: 3, value: 3 },
      { completed: 1, expected: null, total: 3, value: 4 },
      { completed: 2, expected: null, total: 3, value: 5 },
      { completed: 3, expected: null, total: 3, value: 6 },
    ])
  })

  it('reset completed and total after each batch completes', async () => {
    const output: { completed: number; expected: number | null; total: number; index: number; value: number }[] = []
    let counter = 0
    /** Increments the counter. */
    const inc = () => ++counter

    const queue = taskQueue<number>({
      onStep: result => output.push(result),
    })
    queue.add([inc, inc])
    await sleep(10)
    queue.add([inc, inc, inc])
    await sleep(10)

    expect(output).toEqual([
      { completed: 1, expected: null, total: 2, index: 0, value: 1 },
      { completed: 2, expected: null, total: 2, index: 1, value: 2 },
      { completed: 1, expected: null, total: 3, index: 2, value: 3 },
      { completed: 2, expected: null, total: 3, index: 3, value: 4 },
      { completed: 3, expected: null, total: 3, index: 4, value: 5 },
    ])
  })

  it('expected: constructor option', async () => {
    const output: { completed: number; expected: number | null; total: number; value: number }[] = []

    let counter = 0
    /** Increments the counter after a delay. */
    const incDelayed = () => sleep(0).then(() => ++counter)

    const queue = taskQueue<number>({ expected: 6 })
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })

    expect(output).toEqual([
      // batch 1
      { completed: 1, expected: 6, total: 3, value: 1 },
      { completed: 2, expected: 6, total: 3, value: 2 },
      { completed: 3, expected: 6, total: 3, value: 3 },
      // batch 2
      { completed: 4, expected: 6, total: 6, value: 4 },
      { completed: 5, expected: 6, total: 6, value: 5 },
      { completed: 6, expected: 6, total: 6, value: 6 },
    ])
  })

  it('expected: instance method', async () => {
    const output: { completed: number; expected: number | null; total: number; value: number }[] = []

    let counter = 0
    /** Increments the counter after a delay. */
    const incDelayed = () => sleep(0).then(() => ++counter)

    const queue = taskQueue<number>()
    queue.expected(6)
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })

    expect(output).toEqual([
      // batch 1
      { completed: 1, expected: 6, total: 3, value: 1 },
      { completed: 2, expected: 6, total: 3, value: 2 },
      { completed: 3, expected: 6, total: 3, value: 3 },
      // batch 2
      { completed: 4, expected: 6, total: 6, value: 4 },
      { completed: 5, expected: 6, total: 6, value: 5 },
      { completed: 6, expected: 6, total: 6, value: 6 },
    ])
  })

  it('reset expected and total after end', async () => {
    const output: { completed: number; expected: number | null; total: number; value: number }[] = []

    let counter = 0
    /** Increments the counter after a delay. */
    const incDelayed = () => sleep(0).then(() => ++counter)

    const queue = taskQueue<number>()
    queue.expected(6)
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })

    expect(output).toEqual([
      // batch 1
      { completed: 1, expected: 6, total: 3, value: 1 },
      { completed: 2, expected: 6, total: 3, value: 2 },
      { completed: 3, expected: 6, total: 3, value: 3 },
      // batch 2
      { completed: 4, expected: 6, total: 6, value: 4 },
      { completed: 5, expected: 6, total: 6, value: 5 },
      { completed: 6, expected: 6, total: 6, value: 6 },
      // total is reset after end
      { completed: 1, expected: null, total: 3, value: 7 },
      { completed: 2, expected: null, total: 3, value: 8 },
      { completed: 3, expected: null, total: 3, value: 9 },
    ])
  })

  it('trigger end if there are no running tasks when expected is set to null', async () => {
    const output: { completed: number; expected: number | null; total: number; value: number }[] = []

    let counter = 0
    /** Increments the counter after a delay. */
    const incDelayed = () => sleep(0).then(() => ++counter)

    const queue = taskQueue<number>()
    queue.expected(10)
    await queue.add([incDelayed, incDelayed, incDelayed], { onStep: result => output.push(result) })
    queue.expected(null)

    expect(output).toEqual([
      { completed: 1, expected: 10, total: 3, value: 1 },
      { completed: 2, expected: 10, total: 3, value: 2 },
      { completed: 3, expected: 10, total: 3, value: 3 },
    ])

    const endTotal = await queue.end

    expect(endTotal).toBe(3)
  })

  it('onLowStep', async () => {
    const output: { completed: number; expected: number | null; total: number; index: number; value: string }[] = []

    /** Returns a task that returns a value after a given number of milliseconds. */
    const delayedValue = (s: string, n: number) => async () => {
      await sleep(n)
      return s
    }

    await taskQueue<string>({
      onLowStep: result => output.push(result),
      tasks: [delayedValue('a', 20), delayedValue('b', 30), delayedValue('c', 10)],
    }).end

    expect(output).toEqual([
      { completed: 2, expected: null, total: 3, index: 0, value: 'a' },
      { completed: 3, expected: null, total: 3, index: 1, value: 'b' },
      { completed: 3, expected: null, total: 3, index: 2, value: 'c' },
    ])
  })

  it('pause', { retry: 5 }, async () => {
    let counter = 0
    /** Increments the counter after a delay. */
    const incDelayed = () => sleep(20).then(() => ++counter)

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
    const incDelayed = () => sleep(20).then(() => ++counter)

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
      await sleep(0)
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
      await sleep(0)
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
      await sleep(0)
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

    const queue = taskQueue<number>({ paused: true, tasks: [inc, inc, inc] })
    queue.add([inc, inc, inc])
    queue.clear()
    queue.start()

    expect(counter).toBe(0)
  })

  it('retry once', async () => {
    const outputStep: { completed: number; expected: number | null; total: number; index: number; value: string }[] = []
    const outputLowStep: { completed: number; expected: number | null; total: number; index: number; value: string }[] =
      []
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
      onStep: result => outputStep.push(result),
      onLowStep: result => outputLowStep.push(result),
      retries: 2,
      timeout: 50,
      tasks: [delayedValueTimeout('a', 10), delayedValueTimeout('b', 20, 1), delayedValueTimeout('c', 30)],
    }).end

    expect(attempts).toEqual(1)

    expect(outputStep).toEqual([
      { completed: 1, expected: null, total: 3, index: 0, value: 'a' },
      { completed: 2, expected: null, total: 3, index: 2, value: 'c' },
      { completed: 3, expected: null, total: 3, index: 1, value: 'b' },
    ])

    expect(outputLowStep).toEqual([
      { completed: 1, expected: null, total: 3, index: 0, value: 'a' },
      { completed: 3, expected: null, total: 3, index: 1, value: 'b' },
      { completed: 3, expected: null, total: 3, index: 2, value: 'c' },
    ])
  })

  it('retry many', async () => {
    const outputStep: { completed: number; expected: number | null; total: number; index: number; value: string }[] = []
    const outputLowStep: { completed: number; expected: number | null; total: number; index: number; value: string }[] =
      []
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
      onStep: result => outputStep.push(result),
      onLowStep: result => outputLowStep.push(result),
      retries: 999,
      timeout: 1,
      tasks: [delayedValueTimeout('a', 0), delayedValueTimeout('b', 0), delayedValueTimeout('c', 0)],
    }).end

    expect(attempts).toBeGreaterThan(1)
  })

  it('retry exceeds timeout', async () => {
    const outputStep: { completed: number; expected: number | null; total: number; index: number; value: string }[] = []
    const outputLowStep: { completed: number; expected: number | null; total: number; index: number; value: string }[] =
      []
    let attempts = 0

    /** Returns a task that returns a value after a given number of milliseconds. */
    const delayedValueTimeout = (s: string, n: number, forceTimeout?: number) => ({
      description: `delayedValueTimeout: ${s}`,
      function: async () => {
        if (forceTimeout && attempts < forceTimeout) {
          attempts++
          await sleep(999999)
        }
        await sleep(n)
        return s
      },
    })

    const queue = taskQueue<string>({
      onStep: result => outputStep.push(result),
      onLowStep: result => outputLowStep.push(result),
      retries: 2,
      timeout: 50,
      tasks: [delayedValueTimeout('a', 10), delayedValueTimeout('b', 20, 999), delayedValueTimeout('c', 30)],
    })

    const errorMessage = await queue.end.catch(e => e.message)

    expect(errorMessage).toBe('Task timed out and retries exceeded. delayedValueTimeout: b')

    expect(attempts).toEqual(3)

    expect(outputStep).toEqual([
      { completed: 1, expected: null, total: 3, index: 0, value: 'a' },
      { completed: 2, expected: null, total: 3, index: 2, value: 'c' },
    ])

    expect(outputLowStep).toEqual([{ completed: 1, expected: null, total: 3, index: 0, value: 'a' }])
  })
})
