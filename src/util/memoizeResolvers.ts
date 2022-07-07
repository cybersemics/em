import Index from '../@types/IndexType'
import ThoughtId from '../@types/ThoughtId'

/** A memoize resolver that encodes an array of objects based on their toString values. */
export const resolveArray = (items: any[]): string => items.join('__RESOLVE__')

/** A memoize resolver that encodes an object based on encoding one level of properties. */
export const resolveShallow = (o: Index<any>): string => resolveArray(Object.values(o))

/** A memoize resolver for Paths and Child[]. */
export const resolvePath = (pathlike: ThoughtId[] | null): string | null =>
  pathlike ? resolveArray(pathlike) : pathlike
