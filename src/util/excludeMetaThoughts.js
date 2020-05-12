import { isFunction } from './isFunction'

/** Exclude meta thoughts from the set of thoughts passed as ann argument */
export const excludeMetaThoughts = thoughts =>
  thoughts.filter(thought => !isFunction(thought.value))
