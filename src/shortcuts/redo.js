import RedoIcon from '../components/RedoIcon'

const redoShortcut = {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  // eslint-disable-next-line
  canExecute: () => false,
  // eslint-disable-next-line
  exec: () => { }
}

export default redoShortcut
