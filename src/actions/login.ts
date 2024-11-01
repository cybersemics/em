import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { statusActionCreator as status } from '../actions/status'
import storage from '../util/storage'

/** Redirects the user to the login page. */
export const loginActionCreator = (): Thunk => dispatch => {
  throw new Error('Not implemented')
  dispatch(status({ value: 'connecting' }))
  storage.setItem('modal-to-show', 'welcome')

  // for some reason a delay is needed and this needs to go after signInWithRedirect, otherwise the alert flickers and is hidden
  setTimeout(() => {
    dispatch(alert('Redirecting to login...'))
  })
}
