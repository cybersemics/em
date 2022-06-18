import ComparatorFunction from '../@types/ComparatorFunction'

/** Pure sort. */
const sort = <T>(arr: T[], ...args: ComparatorFunction<T>[]) => [...arr].sort(...args) // eslint-disable-line fp/no-mutating-methods

export default sort
