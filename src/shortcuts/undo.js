import UndoIcon from '../components/UndoIcon'

const undoShortcut = {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  canExecute: () => false,
  exec: (dispatch, getState) => { }
}

export default undoShortcut
