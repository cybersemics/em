import Alert from '../@types/Alert'
import Thunk from '../@types/Thunk'
import alertStore from '../stores/alert'
import alert from './alert'

type Options = Omit<Alert, 'value'> & {
  clearDelay?: number
}

/** A special alert value that is masked by alertStore. This just needs to be a non-empty stable value to avoid Redux state changes. */
const ALERT_WITH_MINITORE = '__ALERT_WITH_MINITORE__'

/** Dispatches an alert, but uses the alertMinistore to circumvent repeated renders. See: stores/alertMinistore. */
const alertWithMinistore =
  (value: string | null, options?: Options): Thunk =>
  dispatch => {
    alertStore.update(value)
    dispatch(alert(value != null ? ALERT_WITH_MINITORE : null, options))
  }

export default alertWithMinistore
