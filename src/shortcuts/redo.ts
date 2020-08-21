import RedoIcon from '../components/RedoIcon'
import { NOOP } from '../constants'
import { Shortcut } from '../types'

const redoShortcut: Shortcut = {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  canExecute: () => false,
  exec: NOOP
}

export default redoShortcut
