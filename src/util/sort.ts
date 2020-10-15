import { ComparatorFunction } from '../types'

/** Pure sort. */
export const sort = (arr: any[], ...args: ComparatorFunction<any>[]) => [...arr].sort(...args) // eslint-disable-line fp/no-mutating-methods
