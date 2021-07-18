import { alert, status, setAuthLoader } from '../action-creators'
import { Thunk } from '../@types'
import { storage } from '../util/storage'

/** Redirects the user to the Firebase login page. */
const login = (): Thunk => dispatch => {
  const firebase = window.firebase
  const provider = new firebase.auth.GoogleAuthProvider()
  dispatch(status({ value: 'connecting' }))
  storage.setItem('user-login', 'true')
  dispatch(setAuthLoader({ value: true }))
  firebase.auth().signInWithRedirect(provider)

  // for some reason a delay is needed and this needs to go after signInWithRedirect, otherwise the alert flickers and is hidden
  setTimeout(() => {
    dispatch(alert('Redirecting to login...'))
  })
}

export default login
