import { Key } from 'ts-key-enum'
import Shortcut from '../@types/Shortcut'
import { moveThoughtDownActionCreator as moveThoughtDown } from '../actions/moveThoughtDown'
import MoveThoughtDownIcon from '../components/icons/MoveThoughtDownIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const moveThoughtDownShortcut: Shortcut = {
  id: 'moveThoughtDown',
  label: 'Move Thought Down',
  description: 'Move the current thought down.',
  gesture: 'dud',
  keyboard: { key: Key.ArrowDown, meta: true, shift: true },
  svg: MoveThoughtDownIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: dispatch => dispatch(moveThoughtDown()),
}

export default moveThoughtDownShortcut
