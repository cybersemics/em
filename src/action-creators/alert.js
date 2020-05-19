import { store } from '../store'

/**
 * Dispatches an alert action.
 *
 * @param value The string or React Component that will be rendered in the alert.
 * @param showCloseLink Show a small 'x' in the upper right corner that allows the user to close the alert. Default: true.
 * @param type An arbitrary alert type that can be added to the alert. This is useful if specific alerts needs to be detected later on, for example, to determine if the alert should be closed, or if it has been superceded by a different alert type.
 */
export default (value, { showCloseLink, alertType } = {}) => {
  if (store.getState().alert !== value) {
    store.dispatch({
      type: 'alert',
      value,
      alertType,
      showCloseLink: showCloseLink !== false
    })
  }
}
