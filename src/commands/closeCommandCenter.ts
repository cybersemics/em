import Command from '../@types/Command'
import { clearMulticursorsActionCreator } from '../actions/clearMulticursors'
import HelpIcon from '../components/icons/HelpIcon'
import hasMulticursor from '../selectors/hasMulticursor'

const closeCommandCenterCommand: Command = {
  id: 'closeCommandCenter',
  label: 'Close Command Center',
  description: `Closes the command center if it's open. You can also just tap on the empty space.`,
  gesture: 'd',
  hideAlert: true,
  multicursor: false,
  svg: HelpIcon,
  canExecute: state => hasMulticursor(state),
  exec: dispatch => dispatch(clearMulticursorsActionCreator()),
}

export default closeCommandCenterCommand
