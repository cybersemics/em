import { suppressExpansion } from '../action-creators'
import { getThoughtBefore } from '../selectors'
import { contextOf } from '../util'
import { ActionCreator } from '../types'

/** Moves the cursor to the previous sibling, ignoring descendants. */
const cursorPrev = (): ActionCreator => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) return

  const prev = getThoughtBefore(state, cursor)
  if (!prev) return

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  dispatch(suppressExpansion({ duration: 100 }))

  const prevThoughtsRanked = contextOf(cursor).concat(prev)
  dispatch({ type: 'setCursor', thoughtsRanked: prevThoughtsRanked })
}

export default cursorPrev
