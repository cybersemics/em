import Command from '../@types/Command'
import { alertActionCreator as alert } from '../actions/alert'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import HelpIcon from '../components/icons/HelpIcon'
import { AlertType } from '../constants'
import * as selection from '../device/selection'
import hasMulticursor from '../selectors/hasMulticursor'
import scrollZoneHelpMessage from '../selectors/scrollZoneHelpMessage'

/** If zero, then the Command Center was opened without a cursor recently and the default message can be shown. If non-zero, then Open Commmand Center was attempted within the last 10 second and a special alert should be shown that describes where the Scroll Zone is. */
let scrollZoneHelpAlertTimeout = 0
let showScrollZoneHelpAlert = false

const closeCommandCenterCommand = {
  id: 'closeCommandCenter',
  label: 'Close Command Center' as const,
  description: `Closes the command center if it's open. You can also just tap on the empty space.`,
  gesture: 'd',
  hideAlert: true,
  hideFromDesktopCommandUniverse: true,
  multicursor: false,
  svg: HelpIcon,
  exec: (dispatch, getState) => {
    const state = getState()

    // Always clear the timeout, even if opening the Command Center was a success.
    // Otherwise quickly closing and opening the Command Center will inadvertently trigger the special alert.
    clearTimeout(scrollZoneHelpAlertTimeout)

    // Command Center is open, or a multiselection is active while it is hidden (Clear Thought, Undo Slider).
    // Close it outright rather than only clearing the multiselection and leaving multicursorAlertMiddleware to notice:
    // the middleware ignores the change while a multicursor command is executing, which strands the Command Center on
    // screen with a multiselection of zero, where this gesture would then have nothing left to clear. toggleDropdown
    // clears the multicursors as it closes.
    if (state.showCommandCenter || hasMulticursor(state)) {
      dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: false }))

      showScrollZoneHelpAlert = false
    }
    // Command Center is closed
    else {
      // close keyboard
      if (selection.isThought()) {
        selection.clear()
      }
      // scroll zone help alert
      else {
        if (showScrollZoneHelpAlert) {
          dispatch(alert(scrollZoneHelpMessage(state), { alertType: AlertType.ScrollZoneHelp }))
        }

        // Set a timer for 10 seconds. If the Command Center is opened without a cursor within that time, an alert will be shown that tries to help the user if they are confused about the scroll zone.
        showScrollZoneHelpAlert = true
        scrollZoneHelpAlertTimeout = window.setTimeout(() => {
          showScrollZoneHelpAlert = false
        }, 10000) as number
      }
    }
  },
} satisfies Command

export default closeCommandCenterCommand
