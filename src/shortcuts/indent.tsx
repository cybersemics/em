import Shortcut from '../@types/Shortcut'
import { indentActionCreator as indent } from '../actions/indent'
import IndentIcon from '../components/icons/IndentIcon'
import isDocumentEditable from '../util/isDocumentEditable'
import moveCursorForward from './moveCursorForward'

const indentShortcut: Shortcut = {
  id: 'indent',
  label: 'Indent',
  description: 'Indent the current thought one level deeper.',
  overlay: {
    keyboard: moveCursorForward.keyboard,
  },
  gesture: 'rlr',
  svg: IndentIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => dispatch(indent()),
}

export default indentShortcut
