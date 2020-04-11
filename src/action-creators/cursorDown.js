import { store } from '../store'

// util
import {
  head,
  getNextThoughtsWithContextChain,
  pathToContext,
  rootedContextOf,
} from '../util.js'

export const cursorDown = ({ target }) => dispatch => {

  const { cursor } = store.getState()
  const { value, rank } = head(cursor)
  const contextRanked = rootedContextOf(cursor)
  const context = pathToContext(contextRanked)

  const { nextThoughts, contextChain } = getNextThoughtsWithContextChain(value, context, rank, cursor, contextRanked)

  dispatch({ type: 'setCursor', thoughtsRanked: nextThoughts, contextChain: contextChain || [], cursorHistoryClear: true, editing: true })
}
