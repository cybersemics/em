import { store } from '../store'
import globals from '../globals.js'

// util
import {
  contextOf,
  getThoughtAfter,
  headValue,
  isDivider,
  selectNextEditable
} from '../util'

export const cursorNext = ({ target }) => dispatch => {
  const { cursor } = store.getState()

  // select next editable
  if (cursor) {
    const next = getThoughtAfter(cursor)
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
