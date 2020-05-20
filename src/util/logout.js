import { store } from '../store'
import { clearAll } from '../db'

// constants
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
  RANKED_ROOT,
} from '../constants'

// util
import {
  importText,
  updateUrlHistory,
} from '../util'

/** Logs the user out of Firebase and clears the state. */
export const logout = () => {

  // clear local db
  clearAll().catch(err => {
    throw new Error(err)
  })

  // clear autologin
  localStorage.autologin = false

  // clear initial settings
  importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS)

  // scroll to top
  window.scrollTo(0, 0)

  // set url to root
  updateUrlHistory(store.getState(), RANKED_ROOT)

  // sign out
  window.firebase.auth().signOut()

  // clear state variables
  store.dispatch({ type: 'clear' })
}
