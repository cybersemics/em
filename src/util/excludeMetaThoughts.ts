import { isFunction } from './isFunction'
import { Thought } from '../types'

/** Exclude meta thoughts from the set of thoughts passed as ann argument. */
export const excludeMetaThoughts = (thoughts: Thought[]): Thought[] =>
  thoughts.filter(thought => !isFunction(thought.value))
