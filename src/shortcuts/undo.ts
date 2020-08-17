import { Dispatch } from 'react'
import UndoIcon from '../components/UndoIcon'
import { Shortcut } from '../types'
import { State } from '../util/initialState'

interface UndoAction {
  type: 'undoAction',
}

const undoShortcut: Shortcut = {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  canExecute: (getState: () => State) => getState().inversePatches.length > 0,
  exec: (dispatch: Dispatch<UndoAction>, getState: () => State) => {
    if (!getState().inversePatches.length) {
      return
    }
    dispatch({
      type: 'undoAction',
    })
  }
}

export default undoShortcut
