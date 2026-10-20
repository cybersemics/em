import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
import getAncestorByValue from '../selectors/getAncestorByValue'

/** Determines whether an indexed thought is archived or not. */
const isArchived = (state: State, indexedThought: Lexeme) =>
  !indexedThought.some(thoughtContext => getAncestorByValue(state, thoughtContext, '=archive'))

export default isArchived
