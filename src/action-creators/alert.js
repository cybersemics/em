import { store } from '../store.js'

export default (value, { showCloseLink } = {}) => {
  if (store.getState().alert !== value) {
    store.dispatch({
      type: 'alert',
      value,
      showCloseLink: showCloseLink !== false
    })
  }
}
