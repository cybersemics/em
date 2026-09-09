import Command from '../@types/Command'
import { addMulticursorActionCreator as addMulticursor } from '../actions/addMulticursor'
import { alertActionCreator as alert } from '../actions/alert'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import HelpIcon from '../components/icons/HelpIcon'
import { AlertType } from '../constants'
import hasMulticursor from '../selectors/hasMulticursor'
import scrollZoneHelpMessage from '../selectors/scrollZoneHelpMessage'

/** If zero, then the Command Center was opened without a cursor recently and the default message can be shown. If non-zero, then Open Commmand Center was attempted within the last 10 second and a special alert should be shown that describes where the Scroll Zone is. */
let scrollZoneHelpAlertTimeout = 0
let showScrollZoneHelpAlert = false

const openCommandCenterCommand = {
  id: 'openCommandCenter',
  label: 'Open Command Center' as const,
  description: `Opens a special keyboard which contains commands that can be executed on the cursor thought.`,
  gesture: 'u',
  hideAlert: true,
  hideFromDesktopCommandUniverse: true,
  multicursor: false,
  svg: HelpIcon,
  exec: (dispatch, getState) => {
    const state = getState()

    // Always clear the timeout, even if opening the Command Center was a success.
    // Otherwise quickly closing and opening the Command Center will inadvertently trigger the special alert.
    clearTimeout(scrollZoneHelpAlertTimeout)

    // Swiping up with nothing to act on cannot open the Command Center, and swiping up while it is already open is more
    // likely to be an attempt to scroll.
    if (state.showCommandCenter || (!state.cursor && !hasMulticursor(state))) {
      if (!showScrollZoneHelpAlert) {
        if (!state.showCommandCenter) {
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

    // Select the cursor thought, unless a multiselection is already active and adding to it would be a no-op. A
    // multiselection outlives the Command Center wherever it is hidden with the selection intact: over an edit (Clear
    // Thought), under the Undo Slider, and during a multicursor command.
    // Open the Command Center outright rather than leaving multicursorAlertMiddleware to notice the multiselection.
    // The middleware ignores multiselection changes while a multicursor command is executing and declines to re-open
    // over an edit; neither should silence an explicit swipe, which is the user asking for the Command Center they can
    // see is closed.
    dispatch([
      state.cursor && !hasMulticursor(state) ? addMulticursor({ path: state.cursor }) : null,
      toggleDropdown({ dropDownType: 'commandCenter', value: true }),
    ])

    showScrollZoneHelpAlert = false
  },
} satisfies Command

export default openCommandCenterCommand
