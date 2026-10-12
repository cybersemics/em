/** A memoize resolver that encodes an array of objects based on their toString values. */
const resolveArray = <T>(items: readonly T[]): string => items.join('__RESOLVE__')

export default resolveArray
