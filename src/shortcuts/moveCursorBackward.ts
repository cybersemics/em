import { Dispatch } from 'react'
import { Action } from 'redux'
import { Key } from 'ts-key-enum'
import { attributeEquals, simplifyPath } from '../selectors'
import { parentOf, isDocumentEditable, pathToContext } from '../util'
import { Shortcut } from '../types'

const moveCursorBackward: Shortcut = {
  id: 'moveCursorBackward',
  name: 'Move Cursor Backward',
  description: `Move the current thought to the next sibling of its context or to previous column in table view.`,
  keyboard: { key: Key.Tab, shift: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch: Dispatch<Action>, getState) => {
    const state = getState()
    const { cursor } = state

    if (!cursor || cursor.length < 2) return

    const path = simplifyPath(state, cursor)
    // parentOf twice because we are checking if this thought is in column 2 of a table
    const contextGrandparent = parentOf(parentOf(pathToContext(path)))
    const isTable = attributeEquals(state, contextGrandparent, '=view', 'Table')

    dispatch({ type: isTable ? 'cursorBack' : 'outdent' })
  }
}

export default moveCursorBackward
