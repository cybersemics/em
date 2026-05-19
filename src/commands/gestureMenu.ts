import Command from '../@types/Command'
import { gestureMenuActionCreator as gestureMenu } from '../actions/gestureMenu'
import CommandUniverseIcon from '../components/icons/CommandUniverseIcon'

const gestureMenuCommand: Command = {
  id: 'gestureMenu',
  label: 'Gesture Menu',
  description: 'Opens the gesture menu where commands can be executed by gesture.',
  hideFromDesktopCommandUniverse: true,
  hideFromGestureMenu: true,
  multicursor: false,
  svg: CommandUniverseIcon,
  exec: dispatch => dispatch(gestureMenu()),
  allowExecuteFromModal: true,
}

export default gestureMenuCommand
