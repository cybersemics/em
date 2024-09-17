import Shortcut from '../@types/Shortcut'
import { extractThoughtActionCreator as extract } from '../actions/extractThought'
import SettingsIcon from '../components/icons/SettingsIcon'
import hasMulticursor from '../selectors/hasMulticursor'

const extractThought: Shortcut = {
  id: 'extractThought',
  label: 'Extract',
  description: 'Extract selected part of a thought as its child',
  keyboard: { key: 'e', control: true, meta: true },
  multicursor: {
    enabled: false,
    error: () => 'Cannot extract multiple thoughts.',
  },
  // TODO: Create unique icon
  svg: SettingsIcon,
  canExecute: getState => {
    const state = getState()
    return !!state.cursor || hasMulticursor(state)
  },
  exec: (dispatch, getState) => {
    dispatch(extract())
  },
}

export default extractThought
