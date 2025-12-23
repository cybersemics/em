import Command from '../@types/Command'
import { addMulticursorActionCreator } from '../actions/addMulticursor'
import HelpIcon from '../components/icons/HelpIcon'
import hasMulticursor from '../selectors/hasMulticursor'

const openCommandCenterCommand: Command = {
  id: 'openCommandCenter',
  label: 'Open Command Center',
  description: `Opens a special keyboard which contains commands that can be executed on the cursor thought.`,
  gesture: 'u',
  hideAlert: true,
  multicursor: false,
  svg: HelpIcon,
  canExecute: state => !!state.cursor && !hasMulticursor(state),
  exec: (dispatch, getState) => {
    const state = getState()
    if (!state.cursor) return
    dispatch([addMulticursorActionCreator({ path: state.cursor })])
  },
}

export default openCommandCenterCommand
