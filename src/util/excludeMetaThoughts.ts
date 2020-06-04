import { isFunction } from './isFunction'
import { Lexeme } from '../types'

/** Exclude meta thoughts from the set of thoughts passed as ann argument. */
export const excludeMetaThoughts = (thoughts: Lexeme[]): Lexeme[] =>
  thoughts.filter(thought => !isFunction(thought.value))
