import UndoIcon from '../components/UndoIcon'

export default {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  canExecute: () => false,
  exec: (dispatch, getState) => { }
}
