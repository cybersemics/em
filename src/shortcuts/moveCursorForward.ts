import { attributeEquals, getThoughts, pathToThoughtsRanked } from '../selectors'
import { contextOf, isDocumentEditable, pathToContext } from '../util'
import { State } from '../util/initialState'
import { Dispatch } from 'react'

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

const moveCursorForwardShortcut = {
  id: 'moveCursorForward',
  name: 'Move Cursor Forward',
  description: `Move the current thought to the end of the previous thought or to next column in table view.`,
  keyboard: { key: 'Tab' },
  canExecute: (getState: () => State) => isDocumentEditable() && getState().cursor,
  exec: (dispatch: Dispatch<CursorDown | NewThought | Indent>, getState: () => State) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return
    const thoughtsRanked = pathToThoughtsRanked(state, cursor)
    const context = pathToContext(thoughtsRanked)
    const contextParent = contextOf(context)
    const isTable = attributeEquals(state, contextParent, '=view', 'Table')
    const hasChildren = getThoughts(state, context).length > 0

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

export default moveCursorForwardShortcut
