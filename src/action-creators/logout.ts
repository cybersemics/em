import Thunk from '../@types/Thunk'
import clear from '../action-creators/clear'
import importText from '../action-creators/importText'
import { EM_TOKEN, INITIAL_SETTINGS, INITIAL_SETTING_KEY } from '../constants'
import { clearAll } from '../data-providers/dexie'
import scrollTo from '../device/scrollTo'
import never from '../util/never'
import storage from '../util/storage'

/** Logs the user out of Firebase and clears the state. */
const logout = (): Thunk => (dispatch, getState) => {
  // sign out first to prevent updates to remote
  window.firebase.auth().signOut()

  // clear local db
  clearAll().catch(err => {
    localStorage.removeItem(INITIAL_SETTING_KEY)
    throw new Error(err)
  })

  // clear autologin
  storage.clear()

  // clear state variables
  dispatch(clear())

  // When the user logs out, set the startup modal to auth so that the user is prompted to log in again on refresh.
  storage.setItem('modal-to-show', 'auth')

  // reset initial settings
  dispatch(
    importText({
      path: [EM_TOKEN],
      text: INITIAL_SETTINGS,
      lastUpdated: never(),
      preventSetCursor: true,
    }),
  )

  // scroll to top
  scrollTo('top')
}

export default logout
