import {
  isGreater,
  isSmaller,
} from './comparator.js'

/** Create a function that takes two values and compares the given key.
   Does case insensitive comparison with strings.
*/
export const makeCompareByProp = key => (a, b) => {
  return isGreater(a, b, key) ? 1
    : isSmaller(a, b, key) ? -1
      : 0
}
