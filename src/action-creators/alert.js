import { store } from '../store.js'

export default value => {
  if (store.getState().present.alert !== value) {
    store.dispatch({
      type: 'alert',
      value
    })
  }
}
