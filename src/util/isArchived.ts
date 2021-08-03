import { Lexeme, State } from '../@types'
import { getAncestorByValue } from '../selectors'

/** Determines whether an indexed thought is archived or not. */
export const isArchived = (state: State, indexedThought: Lexeme) =>
  // root thought does not have a contexts property
  !(indexedThought.contexts || []).some(thoughtContext => getAncestorByValue(state, thoughtContext.id, '=archive')) ||
  false
