import { Dispatch } from 'react'
import { Shortcut } from '../@types'
import RedoIcon from '../components/RedoIcon'
import { isRedoEnabled } from '../selectors/isRedoEnabled'

interface RedoAction {
  type: 'redoAction'
}

const redoShortcut: Shortcut = {
  id: 'redo',
  label: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  exec: (dispatch: Dispatch<RedoAction>, getState) => {
    if (!isRedoEnabled(getState())) return
    dispatch({ type: 'redoAction' })
  },
  isActive: getState => isRedoEnabled(getState()),
}

export default redoShortcut
