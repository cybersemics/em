import { store } from '../store.js'

// util
import {
  contextOf,
  getThoughtAfter,
  headValue,
  isDivider,
  restoreSelection,
  selectNextEditable,
  getThoughts
} from '../util.js'

export const cursorDown = ({ target }) => dispatch => {
  const { cursor } = store.getState()
  if (cursor) {
    // select next editable
    const nextThought = getThoughtAfter(cursor)
    const children = getThoughts(cursor)
    if (nextThought) {
      const nextThoughtsRanked = children && children.length > 0 ? cursor.concat(children[0]) : contextOf(cursor).concat(nextThought)
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
    else {
      selectNextEditable(target)
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
