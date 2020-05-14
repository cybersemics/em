export type ComparatorValue = 1 | -1 | 0
export type ComparatorFunction<T> = (a: NonNullable<T>, b: NonNullable<T>) => ComparatorValue
