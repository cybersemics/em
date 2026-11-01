import Command from '../@types/Command'
import { toggleCommandUniverseActionCreator as toggleCommandUniverse } from '../actions/toggleCommandUniverse'
import CommandUniverseIcon from '../components/icons/CommandUniverseIcon'

const openMobileCommandUniverseCommand = {
  id: 'openMobileCommandUniverse',
  label: 'Command Universe' as const,
  description: 'Opens the Command Universe.',
  gesture: 'rdld',
  multicursor: false,
  hideAlert: true,
  hideFromDesktopCommandUniverse: true,
  keyboard: { key: 'p', meta: true },
  svg: CommandUniverseIcon,
  allowExecuteFromModal: true,
  exec: dispatch => {
    dispatch(toggleCommandUniverse({}))
  },
} satisfies Command

export default openMobileCommandUniverseCommand
