import { store } from '../store.js'

// util
import {
  contextOf,
  getThoughtAfter,
  headValue,
  isDivider,
  restoreSelection,
  selectNextEditable
} from '../util.js'

export const cursorNext = ({ target }) => dispatch => {
  const { cursor } = store.getState()

  // select next editable
  if (cursor) {
    const next = getThoughtAfter(cursor)
    if (next) {
      const nextThoughtsRanked = contextOf(cursor).concat(next)
      if (isDivider(headValue(cursor))) {
        restoreSelection(nextThoughtsRanked)
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
