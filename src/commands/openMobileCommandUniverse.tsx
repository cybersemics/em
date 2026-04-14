import Command from '../@types/Command'
import { toggleMobileCommandUniverseActionCreator as toggleMobileCommandUniverse } from '../actions/toggleMobileCommandUniverse'
import MobileCommandUniverseIcon from '../components/icons/MobileCommandUniverseIcon'
import isDocumentEditable from '../util/isDocumentEditable'

const openMobileCommandUniverseCommand: Command = {
  id: 'openMobileCommandUniverse',
  label: 'Command Universe',
  description: 'Opens the Command Universe.',
  gesture: 'rdld',
  multicursor: false,
  hideAlert: true,
  hideFromDesktopCommandUniverse: true,
  svg: MobileCommandUniverseIcon,
  canExecute: () => isDocumentEditable(),
  exec: dispatch => {
    dispatch(toggleMobileCommandUniverse({ value: true }))
  },
}

export default openMobileCommandUniverseCommand
