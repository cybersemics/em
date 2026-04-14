import Command from '../@types/Command'
import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../actions/desktopCommandUniverse'
import CommandUniverseIcon from '../components/icons/CommandUniverseIcon'

const desktopCommandUniverseCommand: Command = {
  id: 'desktopCommandUniverse',
  label: 'Command Universe',
  description: 'Opens the Command Universe.',
  hideFromDesktopCommandUniverse: true,
  multicursor: false,
  svg: CommandUniverseIcon,
  keyboard: { key: 'p', meta: true },
  exec: dispatch => dispatch(desktopCommandUniverse()),
  allowExecuteFromModal: true,
}

export default desktopCommandUniverseCommand
