import Command from '../@types/Command'
import { gestureMenuActionCreator as gestureMenu } from '../actions/gestureMenu'
import CommandPaletteIcon from '../components/icons/CommandPaletteIcon'

const gestureMenuCommand = {
  id: 'gestureMenu',
  label: 'Gesture Menu',
  description: 'Opens the gesture menu where commands can be executed by gesture.',
  hideFromCommandPalette: true,
  multicursor: false,
  svg: CommandPaletteIcon,
  exec: dispatch => dispatch(gestureMenu()),
  allowExecuteFromModal: true,
} satisfies Command

export default gestureMenuCommand
