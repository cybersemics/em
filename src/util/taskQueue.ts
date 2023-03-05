/** A simple task queue with concurrency. */
const taskQueue = <T = any>({
  autostart = true,
  concurrency = 8,
  onStep,
  onEnd,
}: {
  autostart?: boolean
  concurrency?: number
  onStep?: (current: number, total: number) => void
  onEnd?: () => void
} = {}) => {
  if (concurrency <= 0) {
    throw new Error(`Invalid concurrenc: ${concurrency}. Concurrency must be > 0.`)
  }

  let total = 0
  let running = 0
  let complete = 0

  // queue of tasks to process in order, without exceeding concurrency
  const queue: (() => T)[] = []

  // map of currently running tasks
  // const running = new Map<string, Promise<void>>()

  /** Processes the next task in the queue. If the queue is empty or the concurrency limit has been reached, do nothing. */
  const tick = () => {
    if (running >= concurrency) return
    // eslint-disable-next-line fp/no-mutating-methods
    const task = queue.shift()
    if (!task) return

    running++
    Promise.resolve(task()).then(() => {
      complete++
      running--
      onStep?.(complete - 1, total)
      if (queue.length === 0 && running === 0) {
        onEnd?.()
      }
      setTimeout(tick)
    })
  }

  return {
    /** Adds a task to the queue and immediately begins it if under the concurrency limit. */
    add: (tasks: (() => T) | (() => T)[]) => {
      if (typeof tasks === 'function') {
        tasks = [tasks]
      }
      total += tasks.length
      // eslint-disable-next-line fp/no-mutating-methods
      tasks.forEach(task => queue.push(task))

      if (autostart) {
        tick()
      }
    },

    /** Starts running tasks. */
    start: () => {
      // tasks to start with, up to the concurrency limit
      const startTasks = queue.slice(0, concurrency)
      startTasks.forEach(tick)
    },
  }
}

export default taskQueue
