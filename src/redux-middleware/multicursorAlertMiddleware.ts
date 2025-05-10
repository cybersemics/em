import _ from 'lodash'
import pluralize from 'pluralize'
import { ThunkMiddleware } from 'redux-thunk'
import Dispatch from '../@types/Dispatch'
import State from '../@types/State'
import { alertActionCreator } from '../actions/alert'
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

    // clear multicursor alert
    if (!numMulticursors && state.alert?.alertType === AlertType.MulticursorActive) {
      return throttledAlert(dispatch, null)
    }

    if (numMulticursors !== prevNumMulticursors) {
      // show or update multicursor alert
      return throttledAlert(dispatch, `${pluralize('thought', numMulticursors, true)} selected`, {
        alertType: AlertType.MulticursorActive,
      })
    }
  }
}

export default multicursorAlertMiddleware
