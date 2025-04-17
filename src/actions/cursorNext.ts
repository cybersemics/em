/* eslint-disable import/prefer-default-export */
import Path from '../@types/Path'
import Thought from '../@types/Thought'
import Thunk from '../@types/Thunk'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { suppressExpansionActionCreator as suppressExpansion } from '../actions/suppressExpansion'
import { HOME_TOKEN } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import { getChildrenSorted } from '../selectors/getChildren'
import isContextViewActive from '../selectors/isContextViewActive'
import nextContext from '../selectors/nextContext'
import nextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** Moves the cursor to the next sibling, ignoring descendants. In table view, moves to the next row. */
export const cursorNextActionCreator = (): Thunk => (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  if (!cursor) {
    const children = getChildrenSorted(state, HOME_TOKEN)
    if (children.length > 0) {
      dispatch(setCursor({ path: [children[0].id] }))
    }
    return
  }

  const cursorParent = rootedParentOf(state, cursor)
  const showContexts = isContextViewActive(state, parentOf(cursor))
  let next: Thought | null = showContexts ? nextContext(state, cursor) : nextSibling(state, cursor)
  let path: Path | null = null

  // next sibling
  if (next) {
    path = appendToPath(cursorParent, next.id)
  }
  // next row in table view col2
  // (next row in table view col1 is handled by nextSibling in the usual way)
  else if (attributeEquals(state, head(rootedParentOf(state, cursorParent)), '=view', 'Table')) {
    const parentPath = cursorParent
    const nextUncle = nextSibling(state, parentPath)
    if (nextUncle) {
      next = getChildrenSorted(state, nextUncle.id).at(0) || null
      path = next ? appendToPath(rootedParentOf(state, parentPath), nextUncle.id, next.id) : null
    }
  }

  if (!next || !path) return

  const pathParent = rootedParentOf(state, path)
  const parentId = head(pathParent)
  const isCursorPinned =
    attributeEquals(state, next.id, '=pin', 'true') || findDescendant(state, parentId, ['=children', '=pin', 'true'])
  const isTable = attributeEquals(state, parentId, '=view', 'Table')

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  if (!isCursorPinned && !isTable) {
    dispatch(suppressExpansion())
  }

  dispatch(setCursor({ path }))
}
