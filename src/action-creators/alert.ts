import { FunctionComponent } from 'react'
import Alert from '../@types/Alert'
import Thunk from '../@types/Thunk'

type Options = Omit<Alert, 'value'> & {
  clearDelay?: number
}

let clearAlertTimeoutId: ReturnType<typeof setTimeout> | null = null // eslint-disable-line fp/no-let

/**
 * Dispatches an alert action.
 *
 * @param value The string or React Component that will be rendered in the alert.
 * @param showCloseLink Show a small 'x' in the upper right corner that allows the user to close the alert. Default: true.
 * @param type An arbitrary alert type that can be added to the alert. This is useful if specific alerts needs to be detected later on, for example, to determine if the alert should be closed, or if it has been superceded by a different alert type.
 * @param clearDelay Timeout after which alert will be cleared.
 */
const alert =
  (
    value: string | FunctionComponent | null,
    { alertType, showCloseLink, clearDelay, isInline, importFileId }: Options = {},
  ): Thunk =>
  (dispatch, getState) => {
    const { alert } = getState()

    /** Clears the original alert, or NOOP if the alert has changed. */
    const clearOriginalAlert = () => {
      dispatch((dispatch, getState) => {
        const state = getState()
        // Do not clear a different alert than was originally shown.
        // For example, the command palette would be incorrectly cleared after a delay.
        if (alertType !== state.alert?.alertType) return

        dispatch({
          type: 'alert',
          alertType,
          showCloseLink,
          value: null,
          isInline,
        })
      })
      clearAlertTimeoutId = null
    }

    // if clearDelay is not provided i.e undefined alert should not dismiss.
    if (clearDelay) {
      // if clearAlertTimeoutId !== null, it means that previous alert hasn't been cleared yet. In this case cancel previous timeout and start new.
      clearAlertTimeoutId && clearTimeout(clearAlertTimeoutId)
      clearAlertTimeoutId = setTimeout(clearOriginalAlert, clearDelay)
    }

    // do not show the same alert twice
    if (value === (alert?.value || null)) return

    dispatch({
      type: 'alert',
      alertType,
      showCloseLink,
      value,
      importFileId,
      isInline,
    })
  }

export default alert
