import Command from '../@types/Command'
import { removeMulticursorActionCreator } from '../actions/removeMulticursor'
import HelpIcon from '../components/icons/HelpIcon'

const closeCommandCenterCommand: Command = {
  id: 'closeCommandCenter',
  label: 'Close Command Center',
  description: `Closes the command center if it's open. You can also just tap on the empty space.`,
  gesture: 'd',
  multicursor: false,
  svg: HelpIcon,
  canExecute: state => !!state.cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    dispatch([removeMulticursorActionCreator({ path: state.cursor })])
  },
}

export default closeCommandCenterCommand
