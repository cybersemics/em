import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { cursorBackActionCreator as cursorBack } from '../actions/cursorBack'
import { outdentActionCreator as outdent } from '../actions/outdent'
import attributeEquals from '../selectors/attributeEquals'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

const moveCursorBackward: Shortcut = {
  id: 'moveCursorBackward',
  label: 'Move Cursor Backward',
  description: 'Move the current thought to the next sibling of its context or to previous column in table view.',
  keyboard: { key: Key.Tab, shift: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor } = state

    if (!cursor || cursor.length < 2) return

    const path = simplifyPath(state, cursor)
    // parentOf twice because we are checking if this thought is in column 2 of a table
    const grandparentId = head(rootedParentOf(state, parentOf(path)))
    const isTable = attributeEquals(state, grandparentId, '=view', 'Table')

    dispatch(isTable ? cursorBack() : outdent())
  },
}

export default moveCursorBackward
