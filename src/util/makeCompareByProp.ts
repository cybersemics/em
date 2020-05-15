import { lower } from './lower'

import { ComparatorFunction } from '../utilTypes'

/** Returns true if the first object's key is greater than the second object's key. */
export const isGreater = (a:Object, b:Object, key: keyof typeof a & keyof typeof b )  => lower(a[key]) > lower(b[key])

/** Returns true if the first object's key is smaller than the second object's key. */
export const isSmaller = (a:Object, b:Object, key: keyof typeof a & keyof typeof b )  => lower(a[key]) < lower(b[key])

/**
 * Creates a function that takes two values and compares the given key.
 * Does case insensitive comparison with strings.
 */
export const makeCompareByProp = (key:any):ComparatorFunction<Object> => (a: Object, b: Object) =>
  isGreater(a, b, key) ? 1
  : isSmaller(a, b, key) ? -1
  : 0