import { HOME_TOKEN } from '../constants'
import { scrollCursorIntoView, setCursor, suppressExpansion } from '../action-creators'
import { getThoughtBefore, simplifyPath, getChildrenSorted, attributeEquals } from '../selectors'
import { parentOf, pathToContext } from '../util'
import { Thunk } from '../@types'

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

  const path = [...parentOf(cursor), prev]

  const isCursorPinned =
    attributeEquals(state, pathToContext(path), '=pin', 'true') ||
    attributeEquals(state, pathToContext(parentOf(path)), '=pinChildren', 'true')

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  if (!isCursorPinned) dispatch(suppressExpansion({ duration: 100 }))

  dispatch(setCursor({ path }))
  dispatch(scrollCursorIntoView())
}

export default cursorPrev
