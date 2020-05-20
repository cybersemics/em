import { store } from '../store'

/** Dispatches an alert action. */
export default (value, { showCloseLink } = {}) => {
  if (store.getState().alert !== value) {
    store.dispatch({
      type: 'alert',
      value,
      showCloseLink: showCloseLink !== false
    })
  }
}
