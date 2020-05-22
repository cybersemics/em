import { clearAll } from '../db'

// constants
import {
  EM_TOKEN,
  INITIAL_SETTINGS,
  RANKED_ROOT,
} from '../constants'

// util
import {
  updateUrlHistory,
} from '../util'

// action creators
import { importText } from '../action-creators'

/** Logs the user out of Firebase and clears the state. */
const logout = () => (dispatch, getState) => {

  // clear local db
  clearAll().catch(err => {
    throw new Error(err)
  })

  // clear autologin
  localStorage.autologin = false

  // clear initial settings
  dispatch(importText([{ value: EM_TOKEN, rank: 0 }], INITIAL_SETTINGS))

  // scroll to top
  window.scrollTo(0, 0)

  // set url to root
  updateUrlHistory(getState(), RANKED_ROOT)

  // sign out
  window.firebase.auth().signOut()

  // clear state variables
  dispatch({ type: 'clear' })
}

export default logout
