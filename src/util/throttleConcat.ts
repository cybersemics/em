import throttleReduce, { ThrottledFunction } from './throttleReduce'

/** Generates a throttled function that will be invoked with a list of values from the batch of calls queued during the cooldown. */
const throttleConcat = <T, R>(
  f: (accum: T[]) => R,
  ms: number,
  options?: Parameters<typeof throttleReduce>[4],
): ThrottledFunction<T, R> => throttleReduce(f, (a, b) => [...b, a], [] as T[], ms, options)

export default throttleConcat
