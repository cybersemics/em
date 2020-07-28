import UndoIcon from '../components/UndoIcon'

const undoShortcut = {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  // eslint-disable-next-line
  canExecute: () => false,
  // eslint-disable-next-line
  exec: (dispatch, getState) => { }
}

export default undoShortcut
