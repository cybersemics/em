import { Thunk } from '../@types'
import { scrollCursorIntoView, setCursor, suppressExpansion } from '../action-creators'
import { HOME_TOKEN } from '../constants'
// must be imported after util (???)
import { attributeEquals, getChildrenSorted, getThoughtAfter, simplifyPath } from '../selectors'
import { parentOf, pathToContext } from '../util'

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

  const path = parentOf(cursor).concat(next)

  const isCursorPinned =
    attributeEquals(state, pathToContext(path), '=pin', 'true') ||
    attributeEquals(state, pathToContext(parentOf(path)), '=pinChildren', 'true')

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  if (!isCursorPinned) dispatch(suppressExpansion({ duration: 100 }))

  dispatch(setCursor({ path }))
  dispatch(scrollCursorIntoView())
}

export default cursorNext
