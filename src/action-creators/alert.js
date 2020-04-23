import { store } from '../store'

export default (value, { showCloseLink } = {}) => {
  if (store.getState().alert !== value) {
    store.dispatch({
      type: 'alert',
      value,
      showCloseLink: showCloseLink !== false
    })
  }
}
