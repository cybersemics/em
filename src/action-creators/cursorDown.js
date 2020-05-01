import { store } from '../store'

// util
import {
  getNextThoughtsWithContextChain,
} from '../util.js'

export const cursorDown = ({ target }) => dispatch => {

  const { cursor } = store.getState()

  const { nextThoughts, contextChain } = getNextThoughtsWithContextChain(cursor)

  dispatch({ type: 'setCursor', thoughtsRanked: nextThoughts, contextChain: contextChain || [], cursorHistoryClear: true, editing: true })
}
