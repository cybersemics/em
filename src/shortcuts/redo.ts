import { Dispatch } from 'react'
import RedoIcon from '../components/RedoIcon'
import { State } from '../util/initialState'

interface RedoAction {
  type: 'redoAction',
}

const redoShortcut = {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  canExecute: (getState: () => State) => getState().patches.length,
  exec: (dispatch: Dispatch<RedoAction>, getState: () => State) => {
    if (!getState().patches.length) {
      return
    }
    dispatch({
      type: 'redoAction',
    })
  }
}

export default redoShortcut
