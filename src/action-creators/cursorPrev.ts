import { HOME_TOKEN } from '../constants'
import { scrollCursorIntoView, setCursor, suppressExpansion } from '../action-creators'
import { getThoughtBefore, simplifyPath, getChildrenSorted } from '../selectors'
import { parentOf } from '../util'
import { Thunk } from '../types'

/** Moves the cursor to the previous sibling, ignoring descendants. */
const cursorPrev = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) {
    const children = getChildrenSorted(state, [HOME_TOKEN])
    if (children.length > 0) {
      dispatch(setCursor({ path: [children[0]] }))
      dispatch(scrollCursorIntoView())
    }
    return
  }

  const prev = getThoughtBefore(state, simplifyPath(state, cursor))
  if (!prev) return

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  dispatch(suppressExpansion({ duration: 100 }))

  const path = [...parentOf(cursor), prev]
  dispatch(setCursor({ path }))
  dispatch(scrollCursorIntoView())
}

export default cursorPrev
