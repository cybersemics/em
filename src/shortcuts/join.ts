import Shortcut from '../@types/Shortcut'
import { joinActionCreator as join } from '../actions/join'
import SettingsIcon from '../components/icons/SettingsIcon'

const joinThoughts: Shortcut = {
  id: 'join',
  label: 'Join Thoughts',
  description: 'join all siblings and merge their children',
  keyboard: { key: 'i', alt: true, shift: true },
  multicursor: {
    enabled: false,
    error: () => 'Cannot join multiple thoughts.',
  },
  // TODO: Create unique icon
  svg: SettingsIcon,
  canExecute: getState => !!getState().cursor,
  exec: (dispatch, getState) => {
    dispatch(join())
  },
}

export default joinThoughts
