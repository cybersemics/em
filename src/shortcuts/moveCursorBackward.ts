import { Dispatch } from 'react'
import { Action } from 'redux'
import { attributeEquals, simplifyPath } from '../selectors'
import { contextOf, isDocumentEditable, pathToContext } from '../util'
import { State } from '../util/initialState'
import { Shortcut } from '../types'

const moveCursorBackward: Shortcut = {
  id: 'moveCursorBackward',
  name: 'Move Cursor Backward',
  description: `Move the current thought to the next sibling of its context or to previous column in table view.`,
  keyboard: { key: 'Tab', shift: true },
  canExecute: (getState: () => State) => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch: Dispatch<Action>, getState: () => State) => {
    const state = getState()
    const { cursor } = state

    if (!cursor || cursor.length < 2) return

    const thoughtsRanked = simplifyPath(state, cursor)
    // contextOf twice because we are checking if this thought is in column 2 of a table
    const contextGrandparent = contextOf(contextOf(pathToContext(thoughtsRanked)))
    const isTable = attributeEquals(state, contextGrandparent, '=view', 'Table')

    dispatch({ type: isTable ? 'cursorBack' : 'outdent' })
  }
}

export default moveCursorBackward
