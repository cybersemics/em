import { Dispatch } from 'react'
import UndoIcon from '../components/UndoIcon'
import { State } from '../util/initialState'

interface UndoAction {
  type: 'undoAction',
}

const undoShortcut = {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  canExecute: (getState: () => State) => getState().inversePatches.length,
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
