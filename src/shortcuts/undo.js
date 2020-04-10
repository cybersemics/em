import UndoIcon from '../components/undoIcon'

export default {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  canExecute: () => false,
  exec: () => { }
}
