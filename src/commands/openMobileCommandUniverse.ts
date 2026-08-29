import Command from '../@types/Command'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../actions/toggleMobileCommandUniverse'
import CommandUniverseIcon from '../components/icons/CommandUniverseIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const openMobileCommandUniverseCommand = {
  id: 'openMobileCommandUniverse',
  label: 'Command Universe' as const,
  description: 'Opens the Command Universe.',
  gesture: 'rdld',
  multicursor: false,
  hideAlert: true,
  hideFromDesktopCommandUniverse: true,
  svg: CommandUniverseIcon,
  canExecute: () => isDocumentEditable(),
  exec: dispatch => {
    dispatch(toggleMobileCommandUniverse({ value: true }))
  },
} satisfies Command

export default openMobileCommandUniverseCommand
