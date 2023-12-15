import Emitter from 'emitter20'

type TaskFunction<T> = () => T | Promise<T>
type Task<T> = TaskFunction<T> | { function: TaskFunction<T>; description: string }

// map event names to event listener types so that we can properly type .on and .off
interface EventListeners<T> {
  step: (args: { completed: number; expected: number | null; total: number; index: number; value: T }) => void
  lowStep: (args: { completed: number; expected: number | null; total: number; index: number; value: T }) => void
  end: (total: number) => void
}

/** A dummy class is needed to get the typeof a generic function. */
// See: https://stackoverflow.com/questions/50321419/typescript-returntype-of-generic-function/64919133#64919133
// Alternatively, an explicit interface can be defined for the return value.
class TaskQueueWrapper<T> {
  wrapped() {
    return taskQueue<T>()
  }
}

export type TaskQueue<T> = ReturnType<TaskQueueWrapper<T>['wrapped']>

/** Returns a new task that retries the given task up to n times if it out. */
const retriable = <T>(
  f: TaskFunction<T>,
  { description, retries, timeout }: { description?: string; retries: number; timeout: number },
): (() => Promise<any>) => {
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
            return reject(new Error('Task timed out and retries exceeded. ' + (description || '')))
          }
          resolve(retry(retries - 1))
        }, timeout) as unknown as number
      }),
    ])

  return () => retry(retries)
}

/** A simple task queue with concurrency. */
const taskQueue = <
  // task return type (that gets passed to onStep and onLowStep)
  T = any,
>({
  concurrency = 8,
  expected: _expected,
  onLowStep,
  onStep,
  onEnd,
  paused: _paused,
  retries,
  tasks,
  timeout = 30000,
}: {
  // number of concurrent tasks allowed
  concurrency?: number
  /** Initialize the number of expected tasks. If undefined, total will be determined dynamically as tasks are added. */
  expected?: number
  /** An event that is fired once for each completed task, in order. The callback for individual completed tasks will be delayed until contiguous tasks have completed. */
  onLowStep?: EventListeners<T>['lowStep']
  /** An event tha is fired when a task completes. Since asynchronous tasks may complete out of order, onStep may fire out of order. */
  onStep?: EventListeners<T>['step']
  /** An event that is called when all tasks have completed. */
  onEnd?: EventListeners<T>['end']
  /** Starts the queue paused and only begins running tasks when .start() is called. */
  paused?: boolean
  /** Number of times to retry a task after it times out (not including the initial call). This is recommended when using onLowStep, which can halt the whole queue if one task hangs. NOTE: Only use retries if the task is idempotent, as it is possible for a hung task to complete after the retry is initiated. */
  retries?: number
  /** Initial tasks to populate the queue with. */
  tasks?: (Task<T> | null | undefined)[]
  /** Default timeout before retry. Only has an effect when retries option is set. Defaults to 30 sec. */
  timeout?: number
} = {}) => {
  if (concurrency <= 0) {
    throw new Error(`Invalid concurrency: ${concurrency}. Concurrency must be > 0.`)
  }

  // event emitter
  const emitter = new Emitter()

  // Capture the stack trace of the constructor, which will be more informative than the stack trace of tick.
  const constructorStackTrace = new Error().stack

  // queue of tasks to process in order, without exceeding concurrency
  const queue: Task<T>[] = []

  // number of tasks currently running
  let running = 0

  // number of tasks that have completed
  let completed = 0

  // number of tasks that are expected to complete (optional)
  // end will not be triggered until this number is reached
  let expected = _expected || null

  // total number of tasks
  // may change dynamically if add is called multiple times and expected is not set
  let total = 0

  // stops the task runner from running new tasks that are added
  // running tests complete as usual
  let paused = _paused

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
    emitter.on('lowStep', ({ completed, expected, total, index, value }) => {
      onLowStep?.({ completed, expected, total, index, value })
    })

    emitter.on('step', ({ completed, expected, total, index, value }) => {
      onStep?.({ completed, expected, total, index, value })
    })

    emitter.on('end', endTotal => {
      onEnd?.(endTotal)
      resolve(endTotal)
      expected = null
      completed = 0
      total = 0
    })

    /** Processes the next tasks in the queue, up to the concurrency limit. When the task completes, repeats. If the queue is empty or the concurrency limit has been reached, do nothing. */
    tick = () => {
      if (paused || running >= concurrency) return
      const task = queue.shift()
      if (!task) {
        if (total === completed && !expected) {
          emitter.trigger('end', total)
        }
        return
      }

      const index = nextIndex()
      running++

      const taskFunction = typeof task === 'function' ? task : task?.function
      const retriableTask = retries
        ? retriable(taskFunction, {
            description: typeof task === 'function' ? undefined : task.description,
            retries,
            timeout,
          })
        : taskFunction
      Promise.resolve(retriableTask())
        .then((value: T) => {
          completed++
          running--

          emitter.trigger('step', { completed, expected, total, index, value })

          completedByIndex.set(index, { index, value })
          while (completedByIndex.has(indexCompleted)) {
            const task = completedByIndex.get(indexCompleted)!
            completedByIndex.delete(indexCompleted)
            emitter.trigger('lowStep', { ...task, completed, expected, total })
            indexCompleted++
          }

          if (queue.length === 0 && running === 0) {
            if (expected && completed < expected) return
            emitter.trigger('end', total)
            return
          }

          tick()
        })
        .catch(err => {
          paused = true

          err.stack = `${
            err.stack
          }\n\nThe failed task was added to the following taskQueue instance:\n${constructorStackTrace
            // trim "Error:" from the beginning of the stack trace
            ?.split('\n')
            .slice(1)
            .join('\n')}`
          reject(err)
        })

      tick()
    }
  })

  /** Adds a one or more tasks to the queue and immediately begins if under the concurrency limit. Resolves when the given tasks have completed. */
  const add = (
    tasks: Task<T> | (Task<T> | null | undefined)[],
    {
      onStep: onStepBatch,
    }: {
      onStep?: ({
        completed,
        expected,
        total,
      }: {
        completed: number
        expected: number | null
        total: number
        value: T
      }) => void
    } = {},
  ) => {
    const tasksArray = Array.isArray(tasks) ? tasks : [tasks]
    const promises = tasksArray.map(task => {
      if (!task) return null
      const taskFunction = typeof task === 'function' ? task : task?.function
      return (
        // Wrap task in a promise that calls onStepBatch and resolves when the task is complete.
        // This is necessary because we don't have access to the inner promise before the task is run.
        new Promise(resolve => {
          /** Makes the task function asynchronous and triggers onStep when it resolves. */
          const taskResolver = () =>
            Promise.resolve(taskFunction()).then(value => {
              onStepBatch?.({ completed: completed + 1, expected, total, value })
              resolve(value)
              return value
            })
          queue.push(
            typeof task !== 'function' && task.description
              ? { description: task.description, function: taskResolver }
              : taskResolver,
          )
          total++
        })
      )
    })

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

    /** Sets the number of expected tasks. The end event will not be triggered until this many tasks complete. Useful for maintaining stable % progress over multiple batches. */
    expected: (n: number | null) => {
      expected = n
      tick()
    },

    /** Unsubscribe from the end event. */
    off: <K extends keyof EventListeners<T>>(eventName: K, f: EventListeners<T>[K]) => {
      if (!f) return
      emitter.off(eventName, f)
    },

    /** Subscribe to the end event. */
    on: <K extends keyof EventListeners<T>>(eventName: K, f: EventListeners<T>[K]) => {
      if (!f) return
      emitter.on(eventName, f)
    },

    /** Returns a promise that resolves the next time the event is triggered. */
    once: <K extends keyof EventListeners<K>>(eventName: K): Promise<Parameters<EventListeners<T>[K]>[0]> =>
      new Promise(resolve => {
        /** Resolve the promise and remove the emitter handler. */
        const resolveAndUnsubscribe = (arg: Parameters<EventListeners<T>[K]>[0]) => {
          resolve(arg)
          emitter.off(eventName, resolveAndUnsubscribe as any)
        }
        emitter.on(eventName, resolveAndUnsubscribe as any)
      }),

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
    total: () => expected || total,
  }
}

export default taskQueue
