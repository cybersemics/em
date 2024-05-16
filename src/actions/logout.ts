import Thunk from '../@types/Thunk'
import { clearActionCreator as clear } from '../actions/clear'
import scrollTo from '../device/scrollTo'
import storage from '../util/storage'

/** Logs the user out and clears the state. */
export const logoutActionCreator = (): Thunk => (dispatch, getState) => {
  // clear local db
  // clearAll().catch(err => {
  //   localStorage.removeItem(INITIAL_SETTING_KEY)
  //   throw new Error(err)
  // })

  // clear autologin
  storage.clear()

  // clear state variables
  dispatch(clear())

  // When the user logs out, set the startup modal to auth so that the user is prompted to log in again on refresh.
  storage.setItem('modal-to-show', 'auth')

  // scroll to top
  scrollTo('top')
}
