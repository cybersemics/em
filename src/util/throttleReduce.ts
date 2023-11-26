import _ from 'lodash'

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
  {
    leading = true,
    trailing = true,
    throttle = _.throttle,
  }: {
    /** Default: true. */
    leading?: boolean
    /** Default: true. */
    trailing?: boolean
    /** Custom throttle function (e.g. rafThrottle). Default: _.throttle. */
    throttle?: typeof _.throttle
  } = {},
): ThrottledFunction<T, R> => {
  let accum: U = initialValue
  const queue: T[] = []

  const throttled = throttle(
    (): R | undefined => {
      accum = initialValue
      queue.forEach(value => {
        accum = reducer(value, accum)
      })
      queue.length = 0
      return f(accum)
    },
    ms,
    {
      leading,
      trailing,
    },
  )

  /** Pushes the values onto the queue and triggers the throttled callback. */
  const enqueue = (value: T) => {
    queue.push(value)
    return throttled()
  }

  enqueue.cancel = () => throttled.flush()
  enqueue.flush = () => (queue.length > 0 ? throttled.flush() : undefined)
  enqueue.size = () => queue.length

  return enqueue
}

export default throttleReduce
