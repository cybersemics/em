import { store } from '../store'
import globals from '../globals'

// util
import {
  contextOf,
  getThoughtBefore,
  headValue,
  isDivider,
  prevThoughtElement,
} from '../util'

export const cursorPrev = () => dispatch => {
  const { cursor } = store.getState()
  const prev = prevThoughtElement(cursor)

  if (prev) {
    const editable = prev.querySelector('.editable')

    globals.suppressExpansion = true

    if (editable) {
      // selectNextEditable and .focus() do not work when moving from a divider for some reason
      if (isDivider(headValue(cursor))) {
        const prevThought = getThoughtBefore(cursor)
        const prevThoughtsRanked = contextOf(cursor).concat(prevThought)
        dispatch({ type: 'setCursor', thoughtsRanked: prevThoughtsRanked })
      }
      else {
        editable.focus()
      }
    }
    else if (prev.querySelector('.divider')) {
      const prevThought = getThoughtBefore(cursor)
      const prevThoughtsRanked = contextOf(cursor).concat(prevThought)
      dispatch({ type: 'setCursor', thoughtsRanked: prevThoughtsRanked })
      document.getSelection().removeAllRanges()
    }
  }
}
