// util
import {
  nextThought,
} from '../util.js'

export const cursorDown = () => (dispatch, getState) => {

  const state = getState()
  const { cursor } = state
  const { nextThoughts, contextChain } = nextThought(state, cursor)

  if (nextThoughts.length) {
    dispatch({ type: 'setCursor', thoughtsRanked: nextThoughts, contextChain: contextChain || [], cursorHistoryClear: true, editing: true })
  }
}
