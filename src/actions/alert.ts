import _ from 'lodash'
import type Alert from '../@types/Alert'
import type { AlertValue } from '../@types/Alert'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import testFlags from '../e2e/testFlags'
import alertStore from '../stores/alert'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import clearMulticursors from './clearMulticursors'

interface Options {
  alertType?: keyof typeof AlertType
  value: AlertValue
  // used to cancel imports
  importFileId?: string
  clearDelay?: number | null
}

/** A special alert value that is masked by alertStore. This just needs to be a non-empty stable value to avoid Redux state changes. */
const ALERT_WITH_MINITORE = '__ALERT_WITH_MINITORE__'

/** Set an alert with an optional close link. */
const alertReducer = (state: State, { alertType, value, importFileId, clearDelay }: Options) => {
  if (value === state.alert?.value) return state
  // Default clearDelay to 5000ms when undefined. Use null to prevent auto-dismiss.
  const resolvedClearDelay = clearDelay === undefined ? 5000 : clearDelay
  return {
    ...state,
    // Deselect All when closing the MulticursorActive alert
    ...(state.alert?.alertType === AlertType.MulticursorActive && value === null ? clearMulticursors(state) : null),
    alert: value
      ? {
          alertType,
          value,
          importFileId,
          // In tests, testFlags.preventAutoDismiss mocks any finite delay to Infinity so alerts never
          // auto-dismiss. This keeps tests deterministic without sleeping or per-alert flags: an alert
          // is assumed present until manually cleared. Infinity is distinguishable from an explicit
          // null, so a regression that dropped an intentional clearDelay: null is still detectable.
          clearDelay:
            testFlags.preventAutoDismiss && Number.isFinite(resolvedClearDelay) ? Infinity : resolvedClearDelay,
        }
      : null,
  }
}

/**
 * Dispatches an alert action.
 *
 * @param value The string or React Component that will be rendered in the alert.
 * @param type An arbitrary alert type that can be added to the alert. This is useful if specific alerts needs to be detected later on, for example, to determine if the alert should be closed, or if it has been superceded by a different alert type.
 * @param clearDelay Timeout after which alert will be cleared. Default: 5000ms. Set to null to prevent auto-dismiss. When clearDelay is set, a close link is shown.
 */
export const alertActionCreator =
  (
    value: AlertValue,
    {
      alertType,
      clearDelay,
      importFileId,
    }: Omit<Alert, 'value'> & {
      clearDelay?: number | null
    } = {},
  ): Thunk =>
  (dispatch, getState) => {
    const { alert } = getState()

    // do not show the same alert twice
    // do not clear an alert with a non-matching alertType
    if (value === (alert?.value || null) || (!value && alert && alertType && alertType !== alert.alertType)) return

    // clear alert store value
    if (!value) {
      alertStore.update(null)
    }

    dispatch({
      type: 'alert',
      alertType,
      value,
      importFileId,
      clearDelay,
    })
  }

/** Dispatches an alert, but uses the alertMinistore to circumvent repeated renders. See: stores/alertMinistore. */
export const alertWithMinistore =
  (
    value: string | null,
    options?: Omit<Alert, 'value'> & {
      clearDelay?: number | null
    },
  ): Thunk =>
  dispatch => {
    alertStore.update(value)
    dispatch(alertActionCreator(value != null ? ALERT_WITH_MINITORE : null, options))
  }

export default _.curryRight(alertReducer)

// Register this action's metadata
registerActionMetadata('alert', {
  undoable: false,
})
