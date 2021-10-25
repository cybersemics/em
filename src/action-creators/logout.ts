import { clearAll } from '../data-providers/dexie'
import { never } from '../util'
import { clear, importText } from '../action-creators'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { Thunk } from '../@types'
import { storage } from '../util/storage'
import scrollTo from '../device/scrollTo'

/** Logs the user out of Firebase and clears the state. */
const logout = (): Thunk => dispatch => {
  // sign out first to prevent updates to remote
  window.firebase.auth().signOut()

  // clear local db
  clearAll().catch(err => {
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
      path: [{ value: EM_TOKEN, rank: 0 }],
      text: INITIAL_SETTINGS,
      lastUpdated: never(),
      preventSetCursor: true,
    }),
  )

  // scroll to top
  scrollTo('top')
}

export default logout
