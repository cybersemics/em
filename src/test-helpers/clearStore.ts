import { clearActionCreator as clear } from '../actions/clear'
import store from '../stores/app'

/** Dispatches actions on the global store in an act block. */
const clearStore = async () => {
  store.dispatch(clear())
}

export default clearStore
