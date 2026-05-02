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
      } else if (numMulticursors > 0 && !state.showCommandCenter) {
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
          },
        )
      }
    }
  }
}

export default multicursorAlertMiddleware
