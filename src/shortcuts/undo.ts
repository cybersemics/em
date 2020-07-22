import { Dispatch } from 'react'
import UndoIcon from '../components/UndoIcon'
import { Shortcut } from '../types'

interface UndoAction {
  type: 'undoAction',
}

const undoShortcut: Shortcut = {
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
