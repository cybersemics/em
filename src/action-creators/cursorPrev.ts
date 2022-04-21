import { HOME_TOKEN } from '../constants'
import { setCursor, suppressExpansion } from '../action-creators'
import { getThoughtBefore, simplifyPath, getChildrenSorted, attributeEquals } from '../selectors'
import { appendToPath, parentOf, pathToContext } from '../util'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import { Thunk } from '../@types'

/** Moves the cursor to the previous sibling, ignoring descendants. */
const cursorPrev = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) {
    const children = getChildrenSorted(state, [HOME_TOKEN])
    if (children.length > 0) {
      dispatch(setCursor({ path: [children[0].id] }))
      scrollCursorIntoView()
    }
    return
  }

  const prev = getThoughtBefore(state, simplifyPath(state, cursor))
  if (!prev) return

  const path = appendToPath(parentOf(cursor), prev.id)
  const context = pathToContext(state, path)
  const contextParent = pathToContext(state, parentOf(path))
  const isCursorPinned =
    attributeEquals(state, context, '=pin', 'true') || attributeEquals(state, contextParent, '=pinChildren', 'true')
  const isTable = attributeEquals(state, contextParent, '=view', 'Table')

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  if (!isCursorPinned && !isTable) dispatch(suppressExpansion({ duration: 100 }))

  dispatch(setCursor({ path }))
  scrollCursorIntoView()
}

export default cursorPrev
