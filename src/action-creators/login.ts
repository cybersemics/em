import Thunk from '../@types/Thunk'
import status from '../action-creators/status'
import { alertActionCreator as alert } from '../reducers/alert'
import storage from '../util/storage'

/** Redirects the user to the login page. */
const login = (): Thunk => dispatch => {
  throw new Error('Not implemented')
  dispatch(status({ value: 'connecting' }))
  storage.setItem('modal-to-show', 'welcome')

  // for some reason a delay is needed and this needs to go after signInWithRedirect, otherwise the alert flickers and is hidden
  setTimeout(() => {
    dispatch(alert('Redirecting to login...'))
  })
}

export default login
