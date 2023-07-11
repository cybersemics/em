import { ThrottleSettings, throttle } from 'lodash'

export type ThrottledFunction<T, R> = ((value: T) => R | undefined) & {
  flush: () => R | undefined
  cancel: () => void
  size: () => number
}

/** Generates a throttled function that will be invoked with an accumulated value reduced from the batch of calls queued during the cooldown. */
// TODO: Consolidate U,R types.
const throttleReduce = <T, U, R>(
  f: (accum: U) => R | undefined,
  reducer: (current: T, accum: U) => U,
  initialValue: U,
  ms: number,
  throttleSettings?: ThrottleSettings,
): ThrottledFunction<T, R> => {
  let accum: U = initialValue
  const queue: T[] = []

  const throttled = throttle(
    (): R | undefined => {
      accum = initialValue
      if (queue.length === 0) return
      queue.forEach(value => {
        accum = reducer(value, accum)
      })
      queue.length = 0
      return f(accum)
    },
    ms,
    throttleSettings,
  )

  /** Pushes the values onto the queue and triggers the throttled callback. */
  const enqueue = (value: T) => {
    // eslint-disable-next-line fp/no-mutating-methods
    queue.push(value)
    return throttled()
  }

  enqueue.cancel = () => throttled.flush()
  enqueue.flush = () => (queue.length > 0 ? throttled.flush() : undefined)
  enqueue.size = () => queue.length

  return enqueue
}

export default throttleReduce
