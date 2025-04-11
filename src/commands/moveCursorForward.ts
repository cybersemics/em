import { Dispatch } from 'redux'
import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import MoveCursorForwardIcon from '../components/icons/MoveCursorForwardIcon'
import attributeEquals from '../selectors/attributeEquals'
import { getAllChildren } from '../selectors/getChildren'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

interface CursorDown {
  type: 'cursorDown'
}

interface NewThought {
  type: 'newThought'
  insertNewSubthought: boolean
}

interface Indent {
  type: 'indent'
}

const moveCursorForward: Command = {
  id: 'moveCursorForward',
  label: 'Move Cursor Forward',
  description: 'Move the current thought to the end of the previous thought or to next column in table view.',
  keyboard: { key: Key.Tab },
  multicursor: {
    filter: 'prefer-ancestor',
    execMulticursor(cursors, dispatch, getState, e, {}, execAll) {
      // Make sure we can execute for all cursors before proceeding.
      // This is shifted here to allow `e.preventDefault()` to work.
      const canExecute = cursors.every(cursor => {
        const path = simplifyPath(getState(), cursor)
        const parentId = head(rootedParentOf(getState(), path))
        const isTable = attributeEquals(getState(), parentId, '=view', 'Table')
        return isDocumentEditable() && (isTable || !!prevSibling(getState(), cursor))
      })

      if (!canExecute) return

      return execAll()
    },
  },
  svg: MoveCursorForwardIcon,
  canExecute: state => {
    return isDocumentEditable() && !!state.cursor
  },
  exec: (dispatch: Dispatch<CursorDown | NewThought | Indent>, getState) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return
    const path = simplifyPath(state, cursor)
    const parentId = head(rootedParentOf(state, path))
    const isTable = attributeEquals(state, parentId, '=view', 'Table')
    const hasChildren = getAllChildren(state, head(path)).length > 0

    dispatch(
      isTable
        ? // special case for table
          hasChildren
          ? // if column 2 exists, move cursor to column 2
            { type: 'cursorDown' }
          : // otherwise, create a new subthought
            { type: 'newThought', insertNewSubthought: true }
        : // normal indent
          { type: 'indent' },
    )
  },
}

export default moveCursorForward
