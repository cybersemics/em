import { store } from '../store.js'
import {
  RANKED_ROOT,
} from '../constants.js'

// util
import { updateUrlHistory } from './updateUrlHistory.js'

export const logout = () => {
  store.dispatch({ type: 'clear' })
  updateUrlHistory(RANKED_ROOT)
  window.firebase.auth().signOut()
}
