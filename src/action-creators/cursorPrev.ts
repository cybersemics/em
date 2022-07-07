import Thunk from '../@types/Thunk'
import setCursor from '../action-creators/setCursor'
import suppressExpansion from '../action-creators/suppressExpansion'
import { HOME_TOKEN } from '../constants'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import attributeEquals from '../selectors/attributeEquals'
import { getChildrenSorted } from '../selectors/getChildren'
import getThoughtBefore from '../selectors/getThoughtBefore'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

/** Moves the cursor to the previous sibling, ignoring descendants. */
const cursorPrev = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) {
    const children = getChildrenSorted(state, HOME_TOKEN)
    if (children.length > 0) {
      dispatch(setCursor({ path: [children[0].id] }))
      scrollCursorIntoView()
    }
    return
  }

  const prev = getThoughtBefore(state, simplifyPath(state, cursor))
  if (!prev) return

  const path = appendToPath(rootedParentOf(state, cursor), prev.id)
  const parentId = head(rootedParentOf(state, path))
  const isCursorPinned =
    attributeEquals(state, head(path), '=pin', 'true') || attributeEquals(state, parentId, '=pinChildren', 'true')
  const isTable = attributeEquals(state, parentId, '=view', 'Table')

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  if (!isCursorPinned && !isTable) dispatch(suppressExpansion({ duration: 100 }))

  dispatch(setCursor({ path }))
  scrollCursorIntoView()
}

export default cursorPrev
