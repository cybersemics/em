import globals from '../globals'

// util
import {
  contextOf,
  headValue,
  isDivider,
  selectNextEditable,
} from '../util'

// selectors
import { getThoughtAfter } from '../selectors'

export const cursorNext = ({ target }) => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  // select next editable
  if (cursor) {
    const next = getThoughtAfter(state, cursor)
    if (next) {
      globals.suppressExpansion = true
      const nextThoughtsRanked = contextOf(cursor).concat(next)
      if (isDivider(headValue(cursor))) {
        dispatch({ type: 'setCursor', thoughtsRanked: nextThoughtsRanked })
      }
      else if (isDivider(headValue(nextThoughtsRanked))) {
        dispatch({ type: 'setCursor', thoughtsRanked: nextThoughtsRanked })
        document.getSelection().removeAllRanges()
      }
      else {
        dispatch({ type: 'setCursor', thoughtsRanked: nextThoughtsRanked })
        selectNextEditable(target)
      }
    }
  }
  // if no cursor, select first editable
  else {
    const firstEditable = document.querySelector('.editable')
    if (firstEditable) {
      firstEditable.focus()
    }
  }
}
