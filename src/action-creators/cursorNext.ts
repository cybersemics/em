import { suppressExpansion } from '../action-creators'
import { getThoughtAfter } from '../selectors'
import { contextOf } from '../util'
import { ActionCreator } from '../types'

/** Moves the cursor to the next sibling, ignoring descendants. */
const cursorNext = (): ActionCreator => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) return

  const next = getThoughtAfter(state, cursor)
  if (!next) return

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  dispatch(suppressExpansion({ duration: 100 }))

  const nextThoughtsRanked = contextOf(cursor).concat(next)
  dispatch({ type: 'setCursor', thoughtsRanked: nextThoughtsRanked })
}

export default cursorNext
