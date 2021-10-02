import { clearAll } from '../data-providers/dexie'
import { never } from '../util'
import { clear, importText } from '../action-creators'
import { EM_TOKEN, INITIAL_SETTINGS, INITIAL_SETTING_KEY } from '../constants'
import { Thunk } from '../@types'
import { storage } from '../util/storage'
import scrollTo from '../device/scrollTo'

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
