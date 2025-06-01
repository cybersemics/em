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

/** A middleware that manages multicursor alerts. */
const multicursorAlertMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  return next => action => {
    const prevNumMulticursors = Object.keys(getState().multicursors).length

    next(action)

    const state = getState()
    const numMulticursors = Object.keys(state.multicursors).length

    // on mobile, show the command menu when multicursor is active
    if (isTouch) {
      if (numMulticursors === 0 && state.showCommandMenu) {
        dispatch(toggleDropdown({ dropDownType: 'commandMenu', value: false }))
      } else if (numMulticursors > 0 && !state.showCommandMenu) {
        dispatch(toggleDropdown({ dropDownType: 'commandMenu', value: true }))
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
