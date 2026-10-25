import Command from '../@types/Command'
import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../actions/desktopCommandUniverse'
import CommandUniverseIcon from '../components/icons/CommandUniverseIcon'

const openDesktopCommandUniverseCommand = {
  id: 'openDesktopCommandUniverse',
  label: 'Command Universe' as const,
  description: 'Opens the Command Universe.',
  hideFromDesktopCommandUniverse: true,
  hideFromHelp: true,
  multicursor: false,
  svg: CommandUniverseIcon,
  exec: dispatch => dispatch(desktopCommandUniverse()),
  allowExecuteFromModal: true,
} satisfies Command

export default openDesktopCommandUniverseCommand
