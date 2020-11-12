import { ROOT_TOKEN } from '../constants'
import { scrollCursorIntoView, suppressExpansion } from '../action-creators'
import { getThoughtBefore, simplifyPath, getChildrenSorted } from '../selectors'
import { parentOf } from '../util'
import { ActionCreator } from '../types'

/** Moves the cursor to the previous sibling, ignoring descendants. */
const cursorPrev = (): ActionCreator => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) {
    const children = getChildrenSorted(state, [ROOT_TOKEN])
    if (children.length > 0) {
      dispatch({ type: 'setCursor', path: [children[0]] })
      dispatch(scrollCursorIntoView())
    }
    return
  }

  const prev = getThoughtBefore(state, simplifyPath(state, cursor))
  if (!prev) return

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  dispatch(suppressExpansion({ duration: 100 }))

  const path = parentOf(cursor).concat(prev)
  dispatch({ type: 'setCursor', path })
  dispatch(scrollCursorIntoView())
}

export default cursorPrev
