import Command from '../@types/Command'
import { toggleSidebarActionCreator as toggleSidebar } from '../actions/toggleSidebar'

const toggleSidebarCommand: Command = {
  id: 'toggleSidebar',
  label: 'Toggle Recently Edited',
  keyboard: { key: 'r', alt: true },
  multicursor: false,
  hideFromHelp: true,
  exec: (dispatch, getState) => dispatch(toggleSidebar({ value: !getState().showSidebar })),
}

export default toggleSidebarCommand
