import { toggleSidebar } from '../action-creators'
import { Shortcut } from '../types'

const toggleSidebarShortcut: Shortcut = {
  id: 'toggleSidebar',
  name: 'Toggle Recently Edited',
  keyboard: { key: 'r', alt: true },
  hideFromInstructions: true,
  exec: (dispatch, getState) =>
    dispatch(toggleSidebar({ value: !getState().showSidebar }))
}

export default toggleSidebarShortcut
