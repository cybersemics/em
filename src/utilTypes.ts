/* Possible return values of a sort's comparator function */
export type ComparatorValue = 1 | -1 | 0

/* A standard comparator function used within sort */
export type ComparatorFunction<T> = (a: NonNullable<T>, b: NonNullable<T>) => ComparatorValue
