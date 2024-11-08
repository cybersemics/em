import ComparatorFunction from '../@types/ComparatorFunction'

const EMPTY_ARRAY: any = []

/** Pure sort. Returns a stable object reference for empty arrays. */
const sort = <T>(arr: T[], ...args: ComparatorFunction<T>[]): T[] =>
  arr.length === 0 ? EMPTY_ARRAY : [...arr].sort(...args)

export default sort
