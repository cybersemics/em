import { lower } from './lower.js'
export const isGreater = (a, b, key) => lower(a[key]) > lower(b[key])
export const isSmaller = (a, b, key) => lower(a[key]) < lower(b[key])

/** Create a function that takes two values and compares the given key.
   Does case insensitive comparison with strings.
*/
export const makeCompareByProp = key => (a, b) =>
  isGreater(a, b, key) ? 1
    : isSmaller(a, b, key) ? -1
      : 0
