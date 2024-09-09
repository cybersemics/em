import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import { alertActionCreator } from '../actions/alert'
import { AlertType } from '../constants'

/** A middleware that manages multicursor alerts. */
const multicursorAlertMiddleware: ThunkMiddleware<State> = ({ getState, dispatch }) => {
  return next => action => {
    const prevNumMulticursors = Object.keys(getState().multicursors).length

    next(action)

    const state = getState()
    const numMulticursors = Object.keys(state.multicursors).length

    if (
      numMulticursors !== prevNumMulticursors ||
      (numMulticursors && state.alert?.alertType !== AlertType.MulticursorActive)
    ) {
      // clear multicursor alert
      if (!numMulticursors && state.alert?.alertType === AlertType.MulticursorActive) dispatch(alertActionCreator(null))
      // show or update multicursor alert
      else
        dispatch(
          alertActionCreator(numMulticursors === 1 ? '1 thought selected' : `${numMulticursors} thoughts selected`, {
            alertType: AlertType.MulticursorActive,
          }),
        )
    }
  }
}

export default multicursorAlertMiddleware
