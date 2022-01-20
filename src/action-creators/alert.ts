import { FunctionComponent } from 'react'
import { Thunk } from '../@types'
import { ALERT_TIMEOUT_VALUE } from '../constants'

interface Options {
  alertType?: string
  showCloseLink?: boolean
  clearDelay?: number
  isInline?: boolean
}

let clearAlertTimeoutId: number // eslint-disable-line fp/no-let

/**
 * Dispatches an alert action.
 *
 * @param value The string or React Component that will be rendered in the alert.
 * @param showCloseLink Show a small 'x' in the upper right corner that allows the user to close the alert. Default: true.
 * @param type An arbitrary alert type that can be added to the alert. This is useful if specific alerts needs to be detected later on, for example, to determine if the alert should be closed, or if it has been superceded by a different alert type.
 * @param clearDelay Timeout after which alert will be cleared.
 */
const alert =
  (value: string | FunctionComponent | null, { alertType, showCloseLink, isInline = false }: Options = {}): Thunk =>
  (dispatch, getState) => {
    dispatch({
      type: 'alert',
      alertType,
      showCloseLink,
      value,
      isInline,
    })

    clearTimeout(clearAlertTimeoutId)

    // close the alert after a delay
    clearAlertTimeoutId = window.setTimeout(() => {
      const { alert } = getState()
      if (alert && alert.alertType === alertType) {
        dispatch({
          type: 'alert',
          alertType,
          showCloseLink,
          value: null,
          isInline,
        })
      }
    }, ALERT_TIMEOUT_VALUE)
  }

export default alert
