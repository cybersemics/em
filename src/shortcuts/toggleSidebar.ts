import { Dispatch } from 'react'
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
  exec: (dispatch: Dispatch<ToggleSidebar>, getState) =>
    dispatch({ type: 'toggleSidebar', value: !getState().showSidebar })
}

export default toggleSidebarShortcut
