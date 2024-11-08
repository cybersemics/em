import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import getAncestorByValue from '../selectors/getAncestorByValue'

/** Determines whether an indexed thought is archived or not. */
const isArchived = (state: State, indexedThought: Lexeme) =>
  // root thought does not have a contexts property
  !(indexedThought.contexts || []).some(thoughtContext => getAncestorByValue(state, thoughtContext, '=archive')) ||
  false

export default isArchived
