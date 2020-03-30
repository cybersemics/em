import { store } from '../store.js'
import {
  RANKED_ROOT,
} from '../constants.js'

// util
import { updateUrlHistory } from './updateUrlHistory.js'

// action-creators
import clear from '../action-creators/clear'

export const logout = () => {
  store.dispatch(clear())
  updateUrlHistory(RANKED_ROOT)
  window.firebase.auth().signOut()
}
