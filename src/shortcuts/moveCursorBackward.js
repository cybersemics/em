// util
import {
  contextOf,
  isDocumentEditable,
  pathToContext,
} from '../util'

// selectors
import pathToThoughtsRanked from '../selectors/pathToThoughtsRanked'
import attributeEquals from '../selectors/attributeEquals'

export default {
  id: 'moveCursorBackward',
  name: 'Move Cursor Backward',
  description: `Move the current thought to the next sibling of its context or to previous column in table view.`,
  keyboard: { key: 'Tab', shift: true },
  canExecute: getState => isDocumentEditable() && getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state

    if (cursor.length < 2) return

    const thoughtsRanked = pathToThoughtsRanked(state, cursor)
    // contextOf twice because we are checking if this thought is in column 2 of a table
    const contextGrandparent = contextOf(contextOf(pathToContext(thoughtsRanked)))
    const isTable = attributeEquals(state, contextGrandparent, '=view', 'Table')

    dispatch({ type: isTable ? 'cursorBack' : 'outdent' })
  }
}
