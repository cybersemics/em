import Command from '../@types/Command'
import { toggleSidebarActionCreator as toggleSidebar } from '../actions/toggleSidebar'
import SettingsIcon from '../components/icons/SettingsIcon'

const toggleSidebarCommand: Command = {
  id: 'toggleSidebar',
  label: 'Toggle Recently Edited',
  keyboard: { key: 'r', alt: true },
  multicursor: 'ignore',
  // TODO: Create unique icon
  svg: SettingsIcon,
  hideFromHelp: true,
  exec: (dispatch, getState) => dispatch(toggleSidebar({ value: !getState().showSidebar })),
}

export default toggleSidebarCommand
