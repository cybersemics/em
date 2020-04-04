import { store } from '../store'
import {
  RANKED_ROOT,
} from '../constants'

// util
import { updateUrlHistory } from './updateUrlHistory'

export const logout = () => {
  store.dispatch({ type: 'clear' })
  updateUrlHistory(RANKED_ROOT)
  window.firebase.auth().signOut()
}
