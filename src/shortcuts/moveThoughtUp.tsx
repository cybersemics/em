import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { moveThoughtUpActionCreator as moveThoughtUp } from '../actions/moveThoughtUp'
import MoveThoughtUpIcon from '../components/icons/MoveThoughtUpIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const moveThoughtUpShortcut: Shortcut = {
  id: 'moveThoughtUp',
  label: 'Move Thought Up',
  description: 'Move the current thought up.',
  gesture: 'udu',
  keyboard: { key: Key.ArrowUp, meta: true, shift: true },
  svg: MoveThoughtUpIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => dispatch(moveThoughtUp()),
}

export default moveThoughtUpShortcut
