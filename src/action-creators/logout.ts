import { resetSettings } from '../action-creators'
import { Thunk } from '../@types'

/** Logs the user out of Firebase and clears the state. */
const logout = (): Thunk => dispatch => {
  // sign out first to prevent updates to remote
  window.firebase.auth().signOut()

  resetSettings()
}

export default logout
