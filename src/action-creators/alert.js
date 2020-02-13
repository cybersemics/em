import { store } from '../store.js'

export default value => {
  if (store.getState().alert !== value) {
    store.dispatch({
      type: 'alert',
      value
    })
  }
}
