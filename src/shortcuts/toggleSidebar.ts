import { Dispatch } from 'react'
import { State } from '../util/initialState'
import { Shortcut } from '../types'

interface ToggleSidebar {
  type: 'toggleSidebar',
  value: boolean,
}

const toggleSidebarShortcut: Shortcut = {
  id: 'toggleSidebar',
  name: 'Toggle Recently Edited',
  keyboard: { alt: true, key: 'r' },
  hideFromInstructions: true,
  exec: (dispatch: Dispatch<ToggleSidebar>, getState: () => State) =>
    dispatch({ type: 'toggleSidebar', value: !getState().showSidebar })
}

export default toggleSidebarShortcut
