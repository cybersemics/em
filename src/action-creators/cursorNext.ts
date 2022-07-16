import Thunk from '../@types/Thunk'
import setCursor from '../action-creators/setCursor'
import suppressExpansion from '../action-creators/suppressExpansion'
import { HOME_TOKEN } from '../constants'
import scrollCursorIntoView from '../device/scrollCursorIntoView'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import { getChildrenSorted } from '../selectors/getChildren'
import getThoughtAfter from '../selectors/getThoughtAfter'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'

/** Moves the cursor to the next sibling, ignoring descendants. */
const cursorNext = (): Thunk => (dispatch, getState) => {
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

  const next = getThoughtAfter(state, simplifyPath(state, cursor))
  if (!next) return

  const path = appendToPath(rootedParentOf(state, cursor), next.id)
  const pathParent = rootedParentOf(state, path)
  const parentId = head(pathParent)
  const isCursorPinned =
    attributeEquals(state, next.id, '=pin', 'true') || findDescendant(state, parentId, ['=children', '=pin', 'true'])
  const isTable = attributeEquals(state, parentId, '=view', 'Table')

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  if (!isCursorPinned && !isTable) dispatch(suppressExpansion({ duration: 100 }))

  dispatch(setCursor({ path }))
  scrollCursorIntoView()
}

export default cursorNext
