import Shortcut from '../@types/Shortcut'
import { toggleSidebarActionCreator as toggleSidebar } from '../actions/toggleSidebar'

const toggleSidebarShortcut: Shortcut = {
  id: 'toggleSidebar',
  label: 'Toggle Recently Edited',
  keyboard: { key: 'r', alt: true },
  hideFromHelp: true,
  exec: (dispatch, getState) => dispatch(toggleSidebar({ value: !getState().showSidebar })),
}

export default toggleSidebarShortcut
