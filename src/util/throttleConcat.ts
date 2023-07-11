import { ThrottleSettings } from 'lodash'
import throttleReduce, { ThrottledFunction } from './throttleReduce'

/** Generates a throttled function that will be invoked with a list of values from the batch of calls queued during the cooldown. */
const throttleConcat = <T, R>(
  f: (accum: T[]) => R,
  ms: number,
  throttleSettings?: ThrottleSettings,
): ThrottledFunction<T, R> => throttleReduce(f, (a, b) => [...b, a], [] as T[], ms, throttleSettings)

export default throttleConcat
