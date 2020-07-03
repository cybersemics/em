// util
import {
  contextOf,
  isDocumentEditable,
  pathToContext,
} from '../util'

// selectors
import {
  attributeEquals,
  getThoughts,
  pathToThoughtsRanked,
} from '../selectors'

export default {
  id: 'moveCursorForward',
  name: 'Move Cursor Forward',
  description: `Move the current thought to the end of the previous thought or to next column in table view.`,
  keyboard: { key: 'Tab' },
  canExecute: getState => isDocumentEditable() && getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state
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
