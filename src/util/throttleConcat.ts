import { ThrottleSettings } from 'lodash'
import throttleReduce from './throttleReduce'

/** Generates a throttled function that will be invoked with a list of values from the batch of calls queued during the cooldown. */
const throttleConcat = <T>(
  f: (accum: T[]) => void,
  ms: number,
  throttleSettings?: ThrottleSettings,
): ((value: T) => void) & { flush: () => void } =>
  throttleReduce(f, (a, b) => [...b, a], [] as T[], ms, throttleSettings)

export default throttleConcat
