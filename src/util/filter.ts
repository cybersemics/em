interface Predicate<P> {
  (item: P, index: number): boolean,
}

/**
 * Filter with multiple predicate functions.
 */
export const filter = <T>(array: T[], predicateArray: (Predicate<T>)[]) => {
  return predicateArray.length > 0 ? array.filter((item: T, index) => predicateArray.every(predicate => predicate(item, index))) : array
}
