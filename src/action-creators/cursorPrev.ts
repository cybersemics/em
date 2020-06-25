import { suppressExpansion } from '../action-creators'
import { getThoughtBefore } from '../selectors'
import { contextOf, headValue, isDivider, prevThoughtElement } from '../util'
import { ActionCreator, Child } from '../types'

/** Moves the cursor to the previous element. */
const cursorPrev = (): ActionCreator => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) return

  const prev = prevThoughtElement(cursor)

  if (prev) {
    const editable = prev.querySelector('.editable') as HTMLInputElement | null

    // just long enough to keep the expansion suppressed during cursor movement in rapid succession
    dispatch(suppressExpansion({ duration: 100 }))

    if (editable) {
      // selectNextEditable and .focus() do not work when moving from a divider for some reason
      if (isDivider(headValue(cursor))) {
        const prevThought = getThoughtBefore(state, cursor)
        const prevThoughtsRanked = contextOf(cursor).concat(prevThought as Child)
        dispatch({ type: 'setCursor', thoughtsRanked: prevThoughtsRanked })
      }
      else {
        editable.focus()
      }
    }
    else if (prev.querySelector('.divider')) {
      const prevThought = getThoughtBefore(state, cursor)
      const prevThoughtsRanked = contextOf(cursor).concat(prevThought as Child)
      dispatch({ type: 'setCursor', thoughtsRanked: prevThoughtsRanked })
      const sel = document.getSelection()
      if (sel) {
        sel.removeAllRanges()
      }
    }
  }
}

export default cursorPrev
