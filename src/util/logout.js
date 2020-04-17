import { store } from '../store'

// constants
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  updateUrlHistory,
} from '../util'

export const logout = () => {
  store.dispatch({ type: 'clear' })
  updateUrlHistory(store.getState(), RANKED_ROOT)
  window.firebase.auth().signOut()
}
