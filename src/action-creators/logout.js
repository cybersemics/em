import { clearAll } from '../data-providers/dexie'

// constants
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
} from '../constants'

// action creators
import { importText } from '../action-creators'

/** Logs the user out of Firebase and clears the state. */
const logout = () => (dispatch, getState) => {

  // sign out first to prevent updates to remote
  window.firebase.auth().signOut()

  // clear local db
  clearAll().catch(err => {
    throw new Error(err)
  })

  // clear autologin
  localStorage.autologin = false

  // clear initial settings
  dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS))

  // clear state variables
  dispatch({ type: 'clear' })

  // scroll to top
  window.scrollTo(0, 0)
}

export default logout
