import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import { cursorBackActionCreator as cursorBack } from '../actions/cursorBack'
import { outdentActionCreator as outdent } from '../actions/outdent'
import MoveCursorBackwardIcon from '../components/icons/MoveCursorBackwardIcon'
import attributeEquals from '../selectors/attributeEquals'
import hasMulticursor from '../selectors/hasMulticursor'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import parentOf from '../util/parentOf'

const moveCursorBackward: Command = {
  id: 'moveCursorBackward',
  label: 'Move Cursor Backward',
  description: 'Move the current thought to the next sibling of its context or to previous column in table view.',
  keyboard: { key: Key.Tab, shift: true },
  multicursor: {
    enabled: true,
    filter: 'prefer-ancestor',
    reverse: true,
  },
  svg: MoveCursorBackwardIcon,
  canExecute: state => {
    return isDocumentEditable() && (!!state.cursor || hasMulticursor(state))
  },
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
