import RedoIcon from '../components/RedoIcon'

const redoShortcut = {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  canExecute: () => false,
  exec: () => { }
}

export default redoShortcut
