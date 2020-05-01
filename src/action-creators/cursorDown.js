import { store } from '../store'

// util
import {
  nextThought,
} from '../util.js'

export const cursorDown = ({ target }) => dispatch => {

  const { cursor } = store.getState()

  const { nextThoughts, contextChain } = nextThought(cursor)

  dispatch({ type: 'setCursor', thoughtsRanked: nextThoughts, contextChain: contextChain || [], cursorHistoryClear: true, editing: true })
}
