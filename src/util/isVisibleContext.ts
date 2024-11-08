import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import thoughtToContext from '../selectors/thoughtToContext'
import isAttribute from '../util/isAttribute'

/** Returns true if the thought is not a meta attribute descendant, unless showHiddenThoughts is on. Ideally we would exclude all meta attribute descendants, but this is untenable since unloaded Lexeme contexts may or may not be meta attribute descendants, and are not excluded from the superscript count. If we were to exclude unloaded contexts, we would miss valid, visible contexts. */
const isVisibleContext = (state: State, id: ThoughtId) => {
  const context = thoughtToContext(state, id)
  return state.showHiddenThoughts || !context.some(id => isAttribute(id) && id !== '=archive')
}

export default isVisibleContext
