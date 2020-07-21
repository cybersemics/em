import UndoIcon from '../components/UndoIcon'
import { NOOP } from '../constants'

const undoShortcut = {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  canExecute: () => false,
  exec: NOOP
}

export default undoShortcut
