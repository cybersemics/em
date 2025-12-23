import Command from '../@types/Command'
import { removeMulticursorActionCreator } from '../actions/removeMulticursor'
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
  canExecute: state => !!state.cursor && hasMulticursor(state),
  exec: (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    dispatch([removeMulticursorActionCreator({ path: state.cursor })])
  },
}

export default closeCommandCenterCommand
