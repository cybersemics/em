import { Dispatch } from 'react'
import UndoIcon from '../components/UndoIcon'
import { Shortcut } from '../types'
import { isUndoEnabled } from '../util/isUndoEnabled'

interface UndoAction {
  type: 'undoAction',
}

const undoShortcut: Shortcut = {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  exec: (dispatch: Dispatch<UndoAction>, getState) => {
    if (!isUndoEnabled(getState())) return
    dispatch({ type: 'undoAction' })
  },
  isActive: getState => isUndoEnabled(getState())
}

export default undoShortcut
