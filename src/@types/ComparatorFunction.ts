import ComparatorValue from './ComparatorValue'

/** A standard comparator function used within sort. */
type ComparatorFunction<T> = (a: T, b: T) => ComparatorValue

export default ComparatorFunction
