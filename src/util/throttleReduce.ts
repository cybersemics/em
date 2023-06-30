import { throttle } from 'lodash'

/** Generates a throttled function that will be invoked with an accumulated value reduced from the batch of calls queued during the cooldown. */
const throttleReduce = <T, U>(
  f: (accum: U) => void,
  reducer: (current: T, accum: U) => U,
  initialValue: U,
  ms: number,
): ((value: T) => void) & { flush: () => void } => {
  let accum: U = initialValue
  const queue: T[] = []

  const throttled = throttle(() => {
    accum = initialValue
    if (queue.length === 0) return
    queue.forEach(value => {
      accum = reducer(value, accum)
    })
    queue.length = 0
    f(accum)
  }, ms)

  /** Pushes the values onto the queue and triggers the throttled callback. */
  const enqueue = (value: T) => {
    // eslint-disable-next-line fp/no-mutating-methods
    queue.push(value)
    throttled()
  }

  enqueue.flush = () => {
    throttled.flush()
  }

  return enqueue
}

export default throttleReduce
