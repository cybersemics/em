import { store } from '../store'
import globals from '../globals'

// util
import {
  contextOf,
  headValue,
  isDivider,
  prevThoughtElement,
} from '../util'

// selectors
import { getThoughtBefore } from '../selectors'

export const cursorPrev = () => dispatch => {
  const state = store.getState()
  const { cursor } = state
  const prev = prevThoughtElement(cursor)

  if (prev) {
    const editable = prev.querySelector('.editable')

    globals.suppressExpansion = true

    if (editable) {
      // selectNextEditable and .focus() do not work when moving from a divider for some reason
      if (isDivider(headValue(cursor))) {
        const prevThought = getThoughtBefore(state, cursor)
        const prevThoughtsRanked = contextOf(cursor).concat(prevThought)
        dispatch({ type: 'setCursor', thoughtsRanked: prevThoughtsRanked })
      }
      else {
        editable.focus()
      }
    }
    else if (prev.querySelector('.divider')) {
      const prevThought = getThoughtBefore(state, cursor)
      const prevThoughtsRanked = contextOf(cursor).concat(prevThought)
      dispatch({ type: 'setCursor', thoughtsRanked: prevThoughtsRanked })
      document.getSelection().removeAllRanges()
    }
  }
}
