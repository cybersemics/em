import ComparatorFunction from '../@types/ComparatorFunction'
import Index from '../@types/IndexType'
import lower from './lower'

/** Returns true if the first object's key is greater than the second object's key. */
export const isGreater = <T1 extends Index, T2 extends Index, K extends keyof T1 & keyof T2>(a: T1, b: T2, key: K) =>
  lower(a[key]) > lower(b[key])

/** Returns true if the first object's key is smaller than the second object's key. */
export const isSmaller = <T1 extends Index, T2 extends Index, K extends keyof T1 & keyof T2>(a: T1, b: T2, key: K) =>
  lower(a[key]) < lower(b[key])

/**
 * Creates a function that takes two values and compares the given key.
 * Does case insensitive comparison with strings.
 */
const makeCompareByProp =
  (key: string): ComparatorFunction<Index> =>
  (a: Index, b: Index) =>
    isGreater(a, b, key) ? 1 : isSmaller(a, b, key) ? -1 : 0

export default makeCompareByProp
