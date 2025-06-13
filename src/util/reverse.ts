import ComparatorFunction from '../@types/ComparatorFunction'

/** Get reverse of the given comparator. */
const reverse =
  <T>(comparator: ComparatorFunction<T>): ComparatorFunction<T> =>
  (a: T, b: T) =>
    comparator(b, a)

export default reverse
