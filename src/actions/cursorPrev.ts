/* eslint-disable import/prefer-default-export */
import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import Thunk from '../@types/Thunk'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { suppressExpansionActionCreator as suppressExpansion } from '../actions/suppressExpansion'
import { HOME_TOKEN } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import findDescendant from '../selectors/findDescendant'
import { getChildrenSorted } from '../selectors/getChildren'
import parentContextId from '../selectors/parentContextId'
import prevContext from '../selectors/prevContext'
import { prevSibling } from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import { isContextStep, replaceHead } from '../util/pathStep'

/** Returns the last thought in the col2 of the previous table row, skipping rows with an empty col2. Returns null if no preceding row has a col2 thought. */
const prevCol2 = (state: State, rowPath: Path): { row: Thought; col2: Thought } | null => {
  const row = prevSibling(state, rowPath)
  if (!row) return null
  const col2 = getChildrenSorted(state, row.id).at(-1)
  return col2 ? { row, col2 } : prevCol2(state, replaceHead(rowPath, row.id))
}

/** Moves the cursor to the previous sibling, ignoring descendants. In table view, moves to the prevous row.*/
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

  const cursorParent = rootedParentOf(state, cursor)
  // the head step records whether this position was reached by crossing a context view
  const showContexts = isContextStep(head(cursor))
  let prev = showContexts ? prevContext(state, cursor) : prevSibling(state, cursor)
  let path: Path | null = null

  // prev sibling
  if (prev) {
    // the sibling of a context is reached the same way the context was, so the context-view step is preserved
    path = replaceHead(cursor, prev.id)
  }
  // prev row in table view col2
  // (prev row in table view col1 is handled by prevSibling in the usual way)
  else if (attributeEquals(state, parentContextId(state, rootedParentOf(state, cursorParent)), '=view', 'Table')) {
    const prevRow = prevCol2(state, cursorParent)
    if (prevRow) {
      prev = prevRow.col2
      // replaceHead so that a table row reached through a context view keeps its context-view step
      path = appendToPath(replaceHead(cursorParent, prevRow.row.id), prevRow.col2.id)
    }
  }

  if (!prev || !path) return

  const pathParent = rootedParentOf(state, path)
  const parentId = parentContextId(state, pathParent)
  const isCursorPinned =
    attributeEquals(state, parentContextId(state, path), '=pin', 'true') ||
    findDescendant(state, parentId, ['=children', '=pin', 'true'])
  const isTable = attributeEquals(state, parentId, '=view', 'Table')

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  if (!isCursorPinned && !isTable) {
    dispatch(suppressExpansion())
  }

  dispatch(setCursor({ path }))
}
