import RedoIcon from '../components/RedoIcon'
import { NOOP } from '../constants'

const redoShortcut = {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  canExecute: () => false,
  exec: NOOP
}

export default redoShortcut
