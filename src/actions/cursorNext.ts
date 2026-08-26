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
import nextContext from '../selectors/nextContext'
import nextSibling from '../selectors/nextSibling'
import parentContextId from '../selectors/parentContextId'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import { isContextStep, replaceHead } from '../util/pathStep'

/** Returns the first thought in the col2 of the next table row, skipping rows with an empty col2. Returns null if no subsequent row has a col2 thought. */
const nextCol2 = (state: State, rowPath: Path): { row: Thought; col2: Thought } | null => {
  const row = nextSibling(state, rowPath)
  if (!row) return null
  const col2 = getChildrenSorted(state, row.id).at(0)
  return col2 ? { row, col2 } : nextCol2(state, replaceHead(rowPath, row.id))
}

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
  // the head step records whether this position was reached by crossing a context view
  const showContexts = isContextStep(head(cursor))
  let next: Thought | null = showContexts ? nextContext(state, cursor) : nextSibling(state, cursor)
  let path: Path | null = null

  // next sibling
  if (next) {
    // the sibling of a context is reached the same way the context was, so the context-view step is preserved
    path = replaceHead(cursor, next.id)
  }
  // next row in table view col2
  // (next row in table view col1 is handled by nextSibling in the usual way)
  else if (attributeEquals(state, parentContextId(state, rootedParentOf(state, cursorParent)), '=view', 'Table')) {
    const nextRow = nextCol2(state, cursorParent)
    if (nextRow) {
      next = nextRow.col2
      // replaceHead so that a table row reached through a context view keeps its context-view step
      path = appendToPath(replaceHead(cursorParent, nextRow.row.id), nextRow.col2.id)
    }
  }

  if (!next || !path) return

  const pathParent = rootedParentOf(state, path)
  const parentId = parentContextId(state, pathParent)
  const isCursorPinned =
    // =pin is created on the thought the row displays, so it must be read from there rather than from the Lexeme
    // Lexeme context a context step lands on. Matches cursorPrev and the pin command.
    attributeEquals(state, parentContextId(state, path), '=pin', 'true') ||
    findDescendant(state, parentId, ['=children', '=pin', 'true'])
  const isTable = attributeEquals(state, parentId, '=view', 'Table')

  // just long enough to keep the expansion suppressed during cursor movement in rapid succession
  if (!isCursorPinned && !isTable) {
    dispatch(suppressExpansion())
  }

  dispatch(setCursor({ path }))
}
