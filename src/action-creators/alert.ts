import { FunctionComponent } from 'react'
import { ActionCreator } from '../types'

interface Options {
  alertType?: string,
  showCloseLink?: boolean,
  clearTimeout?: number,
}

let clearAlertTimeoutId: number | null = null// eslint-disable-line fp/no-let

/**
 * Dispatches an alert action.
 *
 * @param value The string or React Component that will be rendered in the alert.
 * @param showCloseLink Show a small 'x' in the upper right corner that allows the user to close the alert. Default: true.
 * @param type An arbitrary alert type that can be added to the alert. This is useful if specific alerts needs to be detected later on, for example, to determine if the alert should be closed, or if it has been superceded by a different alert type.
 * @param clearTimeout Timeout after which alert will be cleared.
 */
const alert = (value: string | FunctionComponent | null, { alertType, showCloseLink, clearTimeout }: Options = {}): ActionCreator => (dispatch, getState) => {
  const { alert } = getState()
  if (alert && alert.value === value) {
    if (clearTimeout && clearAlertTimeoutId) {
      window.clearTimeout(clearAlertTimeoutId)
      clearAlertTimeoutId = window.setTimeout(() => dispatch({
        type: 'alert',
        alertType,
        showCloseLink,
        value: null,
      }), clearTimeout)
    }
    return
  }

  dispatch({
    type: 'alert',
    alertType,
    showCloseLink,
    value,
  })
  if (clearTimeout) {
    clearAlertTimeoutId = window.setTimeout(() => {
      dispatch({
        type: 'alert',
        alertType,
        showCloseLink,
        value: null,
      })
      clearAlertTimeoutId = null
    }, clearTimeout)
  }

}

export default alert
