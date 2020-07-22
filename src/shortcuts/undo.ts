import { Dispatch } from 'react'
import UndoIcon from '../components/UndoIcon'

interface UndoAction {
  type: 'undoAction',
}

const undoShortcut = {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  canExecute: () => true,
  exec: (dispatch: Dispatch<UndoAction>) => {
    dispatch({
      type: 'undoAction',
    })
  }
}

export default undoShortcut
