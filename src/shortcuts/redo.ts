import { Dispatch } from 'react'
import RedoIcon from '../components/RedoIcon'
import { Shortcut } from '../types'

interface RedoAction {
  type: 'redoAction',
}

const redoShortcut: Shortcut = {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  exec: (dispatch: Dispatch<RedoAction>) => {
    dispatch({
      type: 'redoAction',
    })
  }
}

export default redoShortcut
