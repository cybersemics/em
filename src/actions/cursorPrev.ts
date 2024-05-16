import Thunk from '../@types/Thunk'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { suppressExpansionActionCreator as suppressExpansion } from '../actions/suppressExpansion'
import { HOME_TOKEN } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import { getChildrenSorted } from '../selectors/getChildren'
import isContextViewActive from '../selectors/isContextViewActive'
import prevContext from '../selectors/prevContext'
import { prevSibling } from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** Moves the cursor to the previous sibling, ignoring descendants. */
export const cursorPrevActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) {
    const children = getChildrenSorted(state, HOME_TOKEN)
    if (children.length > 0) {
      dispatch(setCursor({ path: [children[children.length - 1].id] }))
    }
    return
  }

  const showContexts = isContextViewActive(state, parentOf(cursor))
  const prev = showContexts ? prevContext(state, cursor) : prevSibling(state, cursor)
  if (!prev) return

  const path = appendToPath(rootedParentOf(state, cursor), prev.id)
  const pathParent = rootedParentOf(state, path)
  const parentId = head(pathParent)
  const isCursorPinned =
    attributeEquals(state, head(path), '=pin', 'true') || findDescendant(state, parentId, ['=children', '=pin', 'true'])
  const isTable = attributeEquals(state, parentId, '=view', 'Table')

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  if (!isCursorPinned && !isTable) {
    dispatch(suppressExpansion())
  }

  dispatch(setCursor({ path }))
}
