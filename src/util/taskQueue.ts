/** Creates a simple mutex. */
const mutex = () => {
  let locked = false
  let interval: number

  /** Try once to lock the mutex. Invokes the callback if successful. */
  const tryLock = (cb: () => void) => {
    if (!locked) {
      clearInterval(interval)
      locked = true
      cb()
      return true
    }
    return false
  }

  return {
    // locks the mutex as soon as it becomes available
    lock: () =>
      new Promise<void>(resolve => {
        if (!tryLock(resolve)) {
          interval = setInterval(tryLock(resolve)) as number
        }
      }),

    // unlocks the mutex
    // only do this after a successful lock
    unlock: () => {
      locked = false
    },
  }
}

/** A simple task queue with concurrency. */
const taskQueue = ({
  concurrency = 8,
  onStep,
  onEnd,
}: { concurrency?: number; onStep?: (current: number, total: number) => void; onEnd?: () => void } = {}) => {
  const mux = mutex()
  let total = 0
  let running = 0
  let complete = 0

  // queue of tasks to process in order, without exceeding concurrency
  let queue: (() => Promise<void>)[] = []

  // map of currently running tasks
  // const running = new Map<string, Promise<void>>()

  /** Processes the next task in the queue. If the queue is empty or the concurrency limit has been reached, do nothing. */
  const tick = async () => {
    if (running >= concurrency) return
    await mux.lock()
    // eslint-disable-next-line fp/no-mutating-methods
    const task = queue.pop()
    mux.unlock()
    if (!task) return

    running++
    task().then(() => {
      complete++
      running--
      onStep?.(complete, total)
      if (queue.length === 0 && running === 0) {
        onEnd?.()
      }
      setTimeout(tick)
    })
  }

  return {
    /** Adds a task to the queue and immediately begins it if under the concurrency limit. */
    add: async (tasks: (() => Promise<void>)[]) => {
      total += tasks.length
      await mux.lock()
      queue = [...queue, ...tasks]
      mux.unlock()
      tick()
    },
  }
}

export default taskQueue
