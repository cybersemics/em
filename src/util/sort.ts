import { ComparatorFunction } from '../types'

/** Pure sort. */
export const sort = <T>(arr: T[], ...args: ComparatorFunction<T>[]) =>
  [...arr].sort(...args) // eslint-disable-line fp/no-mutating-methods
