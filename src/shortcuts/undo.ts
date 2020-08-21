import UndoIcon from '../components/UndoIcon'
import { NOOP } from '../constants'
import { Shortcut } from '../types'

const undoShortcut: Shortcut = {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  canExecute: () => false,
  exec: NOOP
}

export default undoShortcut
