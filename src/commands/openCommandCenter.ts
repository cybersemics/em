import Command from '../@types/Command'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { alertActionCreator as alert } from '../actions/alert'
import HelpIcon from '../components/icons/HelpIcon'
import { AlertType } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
import scrollZoneHelpMessage from '../selectors/scrollZoneHelpMessage'

/** If zero, then the Command Center was opened without a cursor recently and the default message can be shown. If non-zero, then Open Commmand Center was attempted within the last 10 second and a special alert should be shown that describes where the Scroll Zone is. */
let scrollZoneHelpAlertTimeout = 0
let showScrollZoneHelpAlert = false

const openCommandCenterCommand = {
  id: 'openCommandCenter',
  label: 'Open Command Center',
  description: `Opens a special keyboard which contains commands that can be executed on the cursor thought.`,
  gesture: 'u',
  hideAlert: true,
  hideFromCommandPalette: true,
  multicursor: false,
  svg: HelpIcon,
  exec: (dispatch, getState) => {
    const state = getState()

    // Always clear the timeout, even if opening the Command Center was a success.
    // Otherwise quickly closing and opening the Command Center will inadvertently trigger the special alert.
    clearTimeout(scrollZoneHelpAlertTimeout)

    if (!state.cursor || hasMulticursor(state)) {
      if (!showScrollZoneHelpAlert) {
        if (!hasMulticursor(state)) {
          dispatch(alert('Select a thought to open the Command Center.'))
        }
      } else {
        dispatch(alert(scrollZoneHelpMessage(state), { alertType: AlertType.ScrollZoneHelp }))
      }

      // Set a timer for 10 seconds. If the Command Center is opened without a cursor within that time, an alert will be shown that tries to help the user if they are confused about the scroll zone.
      showScrollZoneHelpAlert = true
      scrollZoneHelpAlertTimeout = window.setTimeout(() => {
        showScrollZoneHelpAlert = false
      }, 10000) as number

      return
    }

    dispatch(addMulticursor({ path: state.cursor }))

    showScrollZoneHelpAlert = false
  },
} satisfies Command

export default openCommandCenterCommand
