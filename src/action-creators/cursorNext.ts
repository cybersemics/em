import { HOME_TOKEN } from '../constants'
import { scrollCursorIntoView, setCursor, suppressExpansion } from '../action-creators'
import { parentOf } from '../util'
import { Thunk } from '../types'

// must be imported after util (???)
import { getChildrenSorted, getThoughtAfter, simplifyPath } from '../selectors'

/** Moves the cursor to the next sibling, ignoring descendants. */
const cursorNext = (): Thunk => (dispatch, getState) => {
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

  const next = getThoughtAfter(state, simplifyPath(state, cursor))
  if (!next) return

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  dispatch(suppressExpansion({ duration: 100 }))

  const path = parentOf(cursor).concat(next)
  dispatch(setCursor({ path }))
  dispatch(scrollCursorIntoView())
}

export default cursorNext
