import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { clearMulticursorsActionCreator as clearMulticursors } from '../actions/clearMulticursors'
import HelpIcon from '../components/icons/HelpIcon'
import { AlertType } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
import scrollZoneHelpMessage from '../selectors/scrollZoneHelpMessage'

/** If zero, then the Command Center was opened without a cursor recently and the default message can be shown. If non-zero, then Open Commmand Center was attempted within the last 10 second and a special alert should be shown that describes where the Scroll Zone is. */
let scrollZoneHelpAlertTimeout = 0
let showScrollZoneHelpAlert = false

const closeCommandCenterCommand: Command = {
  id: 'closeCommandCenter',
  label: 'Close Command Center',
  description: `Closes the command center if it's open. You can also just tap on the empty space.`,
  gesture: 'd',
  hideAlert: true,
  hideFromCommandPalette: true,
  multicursor: false,
  svg: HelpIcon,
  exec: (dispatch, getState) => {
    const state = getState()

    // Always clear the timeout, even if opening the Command Center was a success.
    // Otherwise quickly closing and opening the Command Center will inadvertently trigger the special alert.
    clearTimeout(scrollZoneHelpAlertTimeout)

    if (!hasMulticursor(state)) {
      if (showScrollZoneHelpAlert) {
        dispatch(alert(scrollZoneHelpMessage(state), { alertType: AlertType.ScrollZoneHelp }))
      }

      // Set a timer for 10 seconds. If the Command Center is opened without a cursor within that time, an alert will be shown that tries to help the user if they are confused about the scroll zone.
      showScrollZoneHelpAlert = true
      scrollZoneHelpAlertTimeout = window.setTimeout(() => {
        showScrollZoneHelpAlert = false
      }, 10000) as number

      return
    }

    dispatch(clearMulticursors())

    showScrollZoneHelpAlert = false
  },
}

export default closeCommandCenterCommand
