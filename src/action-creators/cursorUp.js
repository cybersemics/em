import { store } from '../store'

// util
import {
  contextOf,
  getThoughtBefore,
  isDivider,
  headValue,
  restoreSelection,
  selectPrevEditable,
} from '../util.js'

export const cursorUp = ({ target }) => dispatch => {
  const { cursor } = store.getState()

  if (cursor) {

    const contextRanked = contextOf(cursor)
    const prevThought = getThoughtBefore(cursor)
    const prevThoughtsRanked = contextRanked.concat(prevThought)

    // if the previous thought is a divider, set the cursor and remove the browser selection
    if (prevThought && isDivider(prevThought.value)) {
      dispatch({ type: 'setCursor', thoughtsRanked: prevThoughtsRanked })
      document.getSelection().removeAllRanges()
    }
    else {
      // selectPrevEditable and .focus() do not work when moving from a divider for some reason
      if (isDivider(headValue(cursor))) {
        const prevThought = getThoughtBefore(cursor)
        const prevThoughtsRanked = contextOf(cursor).concat(prevThought)
        restoreSelection(prevThoughtsRanked)
      }
      else {
        selectPrevEditable(target)
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
