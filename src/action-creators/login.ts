import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../reducers/alert'
import { statusActionCreator as status } from '../reducers/status'
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
