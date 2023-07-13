import Emitter from 'emitter20'

type EventName = 'end' | 'step' | 'lowStep'

/** Returns a new task that retries the given task up to n times if it out. */
const retriable = <T>(f: () => T | Promise<T>, retries: number, ms: number): (() => Promise<any>) => {
  let retryTimer = 0

  /** Recursive retry function with decrementing retries. */
  const retry = (retries: number): Promise<any> =>
    Promise.race([
      Promise.resolve(f()).then(result => {
        clearTimeout(retryTimer)
        return result
      }),
      new Promise((resolve, reject) => {
        retryTimer = setTimeout(() => {
          if (retries <= 0) {
            const errorMessage = 'Task timed out and retries exceeded.'
            reject(new Error(errorMessage))
            return
          }
          resolve(retry(retries - 1))
        }, ms) as unknown as number
      }),
    ])

  return () => retry(retries)
}

/** A simple task queue with concurrency. */
const taskQueue = <
  // task return type (that gets passed to onStep and onLowStep)
  T = any,
>({
  autostart = true,
  concurrency = 8,
  onLowStep,
  onStep,
  onEnd,
  retries,
  tasks,
  timeout = 30000,
}: {
  /** Starts running tasks as soon as they are added. Set to false to start paused. */
  autostart?: boolean
  // number of concurrent tasks allowed
  concurrency?: number
  /** An event that is fired once for each completed task, in order. The callback for individual completed tasks will be delayed until contiguous tasks have completed. */
  onLowStep?: (args: { completed: number; total: number; index: number; value: T }) => void
  /** An event tha is fired when a task completes. Since asynchronous tasks may complete out of order, onStep may fire out of order. */
  onStep?: (args: { completed: number; total: number; index: number; value: T }) => void
  /** An event that is called when all tasks have completed. */
  onEnd?: (total: number) => void
  /** Number of times to retry a task after it times out (not including the initial call). This is recommended when using onLowStep, which can halt the whole queue if one task hangs. NOTE: Only use retries if the task is idempotent, as it is possible for a hung task to complete after the retry is initiated. */
  retries?: number
  /** Initial tasks to populate the queue with. */
  tasks?: ((() => T | Promise<T>) | null | undefined)[]
  /** Default timeout before retry. Only has an effect when retries option is set. Defaults to 30 sec. */
  timeout?: number
} = {}) => {
  if (concurrency <= 0) {
    throw new Error(`Invalid concurrency: ${concurrency}. Concurrency must be > 0.`)
  }

  // event emitter
  const emitter = new Emitter()

  if (onEnd) {
    emitter.on('end', onEnd)
  }

  // queue of tasks to process in order, without exceeding concurrency
  const queue: (() => T | Promise<T>)[] = []

  // number of tasks currently running
  let running = 0

  // number of tasks that have completed
  let completed = 0

  // total number of tasks
  // may change dynamically if add is called multiple times
  let total = 0

  // stops the task runner from running new tasks that are added
  // running tests complete as usual
  let paused = !autostart

  // the lowest index of task that has started
  let indexStarted = 0

  // the lowest index of task that has completed
  // used for onLowStep
  let indexCompleted = 0

  // hold tasks that have been completed out of order for onLowStep
  // entries are deleted as startedLow increases
  const completedByIndex = new Map<number, { index: number; value: T }>()

  /** Gets the index of the next task. */
  // A function is needed instead of simply referencing `started`, since we need closure over the index even after `started`` has been incremented by other tasks. */
  const nextIndex = () => indexStarted++

  // wrap tick in a promise that resolves onEnd
  let tick: () => void = null as any
  const endPromise = new Promise((resolve, reject) => {
    /** Processes the next tasks in the queue, up to the concurrency limit. When the task completes, repeats. If the queue is empty or the concurrency limit has been reached, do nothing. */
    tick = () => {
      if (paused || running >= concurrency) return
      // eslint-disable-next-line fp/no-mutating-methods
      const task = queue.shift()
      if (!task) {
        if (total === 0) {
          emitter.trigger('end', 0)
        }
        return
      }

      const index = nextIndex()
      running++

      const retriableTask = retries ? retriable(task, retries, timeout) : task
      Promise.resolve(retriableTask())
        .then((value: T) => {
          completed++
          running--

          onStep?.({ completed, total, index, value })

          completedByIndex.set(index, { index, value })
          // eslint-disable-next-line fp/no-loops
          while (completedByIndex.has(indexCompleted)) {
            const task = completedByIndex.get(indexCompleted)!
            completedByIndex.delete(indexCompleted)
            onLowStep?.({ ...task, completed, total })
            indexCompleted++
          }

          if (queue.length === 0 && running === 0) {
            emitter.trigger('end', total)
            resolve(total)
            completed = 0
            total = 0
            return
          }

          tick()
        })
        .catch(err => {
          paused = true
          reject(err)
        })

      tick()
    }
  })

  /** Adds a task to the queue and immediately begins it if under the concurrency limit. Resolves when the given tasks have completed. */
  const add = (
    tasks: ((() => T | Promise<T>) | null | undefined)[],
    {
      onStep: onStepBatch,
    }: { onStep?: ({ completed, total }: { completed: number; total: number; value: T }) => void } = {},
  ) => {
    const promises = tasks.map(
      task =>
        task &&
        // wrap task in a promise that resolves when the task is complete
        // this is necessary because we don't have access to the inner promise before the task is run
        new Promise(resolve => {
          // eslint-disable-next-line fp/no-mutating-methods
          queue.push(() =>
            Promise.resolve(task()).then(value => {
              onStepBatch?.({ completed: completed + 1, total, value })
              resolve(value)
              return value
            }),
          )
          total++
        }),
    )

    if (!paused) {
      tick()
    }

    return Promise.all(promises)
  }

  /** Clears the queue. */
  const clear = () => {
    // https://stackoverflow.com/questions/1232040/how-do-i-empty-an-array-in-javascript
    queue.length = 0
  }

  // start running initial tasks if provided
  if (tasks && tasks.length > 0) {
    add(tasks)
  }

  return {
    /** Clears the task queue. */
    clear,

    /** Adds a task to the queue and immediately begins it if under the concurrency limit. Resolves when the given tasks have completed. */
    add,

    /** Returns the number of completed tasks. */
    completed: () => completed,

    /** Convenience promise for the first end event. Do not use with multiple batches (where onEnd would be called multiple times). */
    end: endPromise,

    // TODO: Type args
    off: (eventName: EventName, f: (...args: any) => void) => {
      emitter.off(eventName, f)
    },

    // TODO: Type args
    on: (eventName: EventName, f: (...args: any) => void) => {
      emitter.on(eventName, f)
    },

    // TODO: Type args
    once: (eventName: EventName): Promise<any> => new Promise(resolve => emitter.on(eventName, resolve)),

    /** Stops additional tasks from running until start is called. Does not pause tasks that have already started. */
    pause: () => {
      paused = true
    },

    /** Returns the number of running tasks. */
    running: () => running,

    /** Starts running tasks, or resumes after pause. */
    start: () => {
      paused = false
      tick()
    },

    /** Returns the total number of tasks in the queue. This can increase over time if add is called multiple times. */
    total: () => total,
  }
}

export default taskQueue
