import { Dispatch } from 'react'
import RedoIcon from '../components/RedoIcon'
import { Shortcut } from '../types'
import { State } from '../util/initialState'

interface RedoAction {
  type: 'redoAction',
}

const redoShortcut: Shortcut = {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  canExecute: (getState: () => State) => getState().patches.length > 0,
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
