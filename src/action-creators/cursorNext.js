import { suppressExpansion } from '../action-creators'
import { getThoughtAfter } from '../selectors'
import { contextOf, headValue, isDivider, selectNextEditable } from '../util'

/** Moves the cursor to the next sibling, ignoring children. */
export default ({ target }) => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  // select next editable
  if (cursor) {
    const next = getThoughtAfter(state, cursor)
    if (next) {

      // just long enough to keep the expansion suppressed during cursor movement in rapid succession
      dispatch(suppressExpansion({ duration: 100 }))

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
