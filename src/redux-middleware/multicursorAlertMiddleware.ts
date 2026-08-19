import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import Dispatch from '../@types/Dispatch'
import State from '../@types/State'
import { alertActionCreator } from '../actions/alert'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { isTouch } from '../browser'
import { AlertType } from '../constants'

/** Throttled dispatch for alert actions. */
const throttledAlert = _.throttle(
  (dispatch: Dispatch, ...args: Parameters<typeof alertActionCreator>) => dispatch(alertActionCreator(...args)),
  50,
  { leading: false, trailing: true },
)

/** A middleware that manages multicursor alerts and shows/hides the Command Center on mobile. This is done so that the Alert and Command Center are updated regardless of which action the multiselect is triggered from. Note that this only works in one direction: Multiselect -> Alert/CommandCenter. If the Command Center is closed somewhere else (e.g. toggleDropdown) it will need to clear the multicursors itself. */
const multicursorAlertMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  return next => action => {
    const prevNumMulticursors = Object.keys(getState().multicursors).length

    next(action)

    const state = getState()
    const numMulticursors = Object.keys(state.multicursors).length

    // On mobile, show the Command Center when multicursor is active, and hide it when inactive.
    if (isTouch) {
      if (numMulticursors === 0 && state.showCommandCenter) {
        dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: false }))
      } else if (
        numMulticursors > 0 &&
        !state.showCommandCenter &&
        // Do not open the Command Center while the Undo Slider session is active.
        // Otherwise undoing/redoing a multicursor command (e.g. delete from the Command Center) restores the
        // multicursor, which would re-open the Command Center and dismiss the Undo Slider being used.
        !state.showUndoSlider &&
        // Do not re-open the Command Center while the keyboard is open, i.e. while the multiselection is being edited
        // (Clear Thought). The sheet would cover the editing session, and on iOS any focus that arrives while the
        // Command Center is shown is actively dismissed (see onFocus in Editable), so the keyboard could never open.
        // When the keyboard closes (blur or exiting the cleared state), the multicursors are still active and this
        // branch re-opens the Command Center.
        // Starting a multiselection from none is exempt, since selecting a thought while the keyboard is open is how
        // the Command Center is opened in the first place (Open Command Center adds the cursor thought, and only ever
        // does so when there was no multiselection yet). Checking prevNumMulticursors rather than a plain count-change
        // keeps a multiselection that is already being edited (Clear Thought) from re-opening the Command Center over
        // the editing session should its multicursor count fluctuate for some unrelated reason while typing.
        (!state.isKeyboardOpen || prevNumMulticursors === 0)
      ) {
        dispatch(toggleDropdown({ dropDownType: 'commandCenter', value: true }))
      }
    }
    // on desktop, show a persistent alert
    else {
      // clear multicursor alert
      if (!numMulticursors && state.alert?.alertType === AlertType.MulticursorActive) {
        throttledAlert(dispatch, null)
      }

      if (numMulticursors !== prevNumMulticursors) {
        // show or update multicursor alert
        throttledAlert(
          dispatch,
          numMulticursors === 1 ? '1 thought selected' : `${numMulticursors} thoughts selected`,
          {
            alertType: AlertType.MulticursorActive,
            // Prevent auto-dismiss: the multiselect indicator must remain visible while a selection is active.
            // It is cleared explicitly when the selection reaches zero (see above) or via the Cancel button.
            clearDelay: null,
          },
        )
      }
    }
  }
}

export default multicursorAlertMiddleware
