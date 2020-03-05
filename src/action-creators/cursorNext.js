import { store } from '../store.js'
import globals from '../globals.js'

// util
import {
  contextOf,
  getThoughtAfter,
  headValue,
  isDivider,
  nextThoughtElement,
  restoreSelection,
} from '../util.js'

export const cursorNext = () => dispatch => {
  const { cursor } = store.getState()

  // select next editable
  if (cursor) {
    const next = nextThoughtElement(cursor)
    if (next) {
      const editable = next.querySelector('.editable')

      globals.suppressExpansion = true

      if (editable) {
        // editable focus does not work when moving from a divider for some reason
        if (isDivider(headValue(cursor))) {
          const nextThought = getThoughtAfter(cursor)
          const nextThoughtsRanked = contextOf(cursor).concat(nextThought)
          restoreSelection(nextThoughtsRanked)
        }
        else {
          editable.focus()
        }
      }
      else if (next.querySelector('.divider')) {
        const nextThought = getThoughtAfter(cursor)
        const nextThoughtsRanked = contextOf(cursor).concat(nextThought)
        dispatch({ type: 'setCursor', thoughtsRanked: nextThoughtsRanked })
        document.getSelection().removeAllRanges()
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
