import Command from '../@types/Command'
import { toggleSidebarActionCreator as toggleSidebar } from '../actions/toggleSidebar'

const toggleSidebarCommand = {
  id: 'toggleSidebar',
  label: 'Toggle Recently Edited',
  keyboard: { key: 'r', alt: true },
  multicursor: false,
  hideFromHelp: true,
  exec: (dispatch, getState) => dispatch(toggleSidebar({ value: !getState().showSidebar })),
} satisfies Command

export default toggleSidebarCommand
