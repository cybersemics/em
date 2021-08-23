import { clearAll } from '../data-providers/dexie'
import { never } from '../util'
import { clear, importText } from '../action-creators'
import { EM_TOKEN, INITIAL_SETTINGS } from '../constants'
import { Thunk } from '../@types'
import { storage } from '../util/storage'

/** Logs the user out of Firebase and clears the state. */
const logout = (): Thunk => (dispatch, getState) => {
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
  window.scrollTo(0, 0)
}

export default logout
