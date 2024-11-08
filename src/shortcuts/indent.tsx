import Shortcut from '../@types/Shortcut'
import { indentActionCreator as indent } from '../actions/indent'
import IndentIcon from '../components/icons/IndentIcon'
import attributeEquals from '../selectors/attributeEquals'
import prevSibling from '../selectors/prevSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'
import moveCursorForward from './moveCursorForward'

const indentShortcut: Shortcut = {
  id: 'indent',
  label: 'Indent',
  description: 'Indent the current thought one level deeper.',
  overlay: {
    keyboard: moveCursorForward.keyboard,
  },
  multicursor: {
    enabled: true,
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
  gesture: 'rlr',
  svg: IndentIcon,
  canExecute: state => {
    return isDocumentEditable() && !!state.cursor
  },
  exec: dispatch => dispatch(indent()),
}

export default indentShortcut
