import { ROOT_TOKEN } from '../constants'
import { suppressExpansion } from '../action-creators'
import { contextOf } from '../util'
import { ActionCreator } from '../types'

// selectors
import {
  getChildrenSorted,
  getThoughtAfter,
} from '../selectors'

/** Moves the cursor to the next sibling, ignoring descendants. */
const cursorNext = (): ActionCreator => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) {
    const children = getChildrenSorted(state, [ROOT_TOKEN])
    if (children.length > 0) {
      dispatch({ type: 'setCursor', thoughtsRanked: [children[0]] })
    }
    return
  }

  const next = getThoughtAfter(state, cursor)
  if (!next) return

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  dispatch(suppressExpansion({ duration: 100 }))

  const nextThoughtsRanked = contextOf(cursor).concat(next)
  dispatch({ type: 'setCursor', thoughtsRanked: nextThoughtsRanked })
}

export default cursorNext
