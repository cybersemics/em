import { HOME_TOKEN } from '../constants'
import { setCursor, suppressExpansion } from '../action-creators'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import { appendToPath, parentOf, pathToContext } from '../util'
import { Thunk } from '../@types'

// must be imported after util (???)
import { attributeEquals, getChildrenSorted, getThoughtAfter, simplifyPath } from '../selectors'

/** Moves the cursor to the next sibling, ignoring descendants. */
const cursorNext = (): Thunk => (dispatch, getState) => {
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

  const next = getThoughtAfter(state, simplifyPath(state, cursor))
  if (!next) return

  const path = appendToPath(parentOf(cursor), next.id)
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

export default cursorNext
