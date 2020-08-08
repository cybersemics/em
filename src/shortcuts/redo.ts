import { Dispatch } from 'react'
import RedoIcon from '../components/RedoIcon'

interface RedoAction {
  type: 'redoAction',
}

const redoShortcut = {
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
