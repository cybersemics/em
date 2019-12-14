import { lower } from './lower.js'

/** Create a function that takes two values and compares the given key.
   Does case insensitive comparison with strings.
*/
export const makeCompareByProp = key => (a, b) => {
  return lower(a[key]) > lower(b[key]) ? 1
    : lower(a[key]) < lower(b[key]) ? -1
    : 0
}
