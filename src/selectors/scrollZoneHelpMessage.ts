import State from '../@types/State'
import { Settings } from '../constants'
import getUserSetting from './getUserSetting'

/** Generates a message that explains the scroll zone based on the user's left-handed setting. */
const scrollZoneHelpMessage = (state: State) => {
  const leftHanded = getUserSetting(state, Settings.leftHanded)

  return `Swipe on the ${leftHanded ? 'left' : 'right'} side of the screen to scroll${leftHanded ? ' (left-handed mode)' : ''}. The ${leftHanded ? 'right' : 'left'} side is for gestures.`
}

export default scrollZoneHelpMessage
