import { Dispatch } from 'react'
import { Shortcut } from '../@types'
import UndoIcon from '../components/UndoIcon'
import { isUndoEnabled } from '../selectors/isUndoEnabled'

interface UndoAction {
  type: 'undoAction'
}

const undoShortcut: Shortcut = {
  id: 'undo',
  label: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  exec: (dispatch: Dispatch<UndoAction>, getState) => {
    if (!isUndoEnabled(getState())) return
    dispatch({ type: 'undoAction' })
  },
  isActive: getState => isUndoEnabled(getState()),
}

export default undoShortcut
