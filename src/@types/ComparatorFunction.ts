import { ComparatorValue } from './ComparatorValue'

/** A standard comparator function used within sort. */
export type ComparatorFunction<T> = (a: T, b: T) => ComparatorValue
