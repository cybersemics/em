import { Key } from 'ts-key-enum'
import { attributeEquals, getAllChildren, simplifyPath } from '../selectors'
import { parentOf, isDocumentEditable, pathToContext } from '../util'
import { Dispatch } from 'react'
import { Shortcut } from '../types'

interface CursorDown {
  type: 'cursorDown',
}

interface NewThought {
  type: 'newThought',
  insertNewSubthought: boolean,
}

interface Indent {
  type: 'indent',
}

const moveCursorForward: Shortcut = {
  id: 'moveCursorForward',
  name: 'Move Cursor Forward',
  description: `Move the current thought to the end of the previous thought or to next column in table view.`,
  keyboard: { key: Key.Tab },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch: Dispatch<CursorDown | NewThought | Indent>, getState) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return
    const path = simplifyPath(state, cursor)
    const context = pathToContext(path)
    const contextParent = parentOf(context)
    const isTable = attributeEquals(state, contextParent, '=view', 'Table')
    const hasChildren = getAllChildren(state, context).length > 0

    dispatch(isTable ?
      // special case for table
      hasChildren
        // if column 2 exists, move cursor to column 2
        ? { type: 'cursorDown' }
        // otherwise, create a new subthought
        : { type: 'newThought', insertNewSubthought: true }
      // normal indent
      : { type: 'indent' }
    )

  }
}

export default moveCursorForward
