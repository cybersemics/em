import Thunk from '../@types/Thunk'
import alert from '../action-creators/alert'
import status from '../action-creators/status'
import storage from '../util/storage'

/** Redirects the user to the Firebase login page. */
const login = (): Thunk => dispatch => {
  const firebase = window.firebase
  const provider = new firebase.auth.GoogleAuthProvider()
  dispatch(status({ value: 'connecting' }))
  firebase.auth().signInWithRedirect(provider)
  storage.setItem('modal-to-show', 'welcome')

  // for some reason a delay is needed and this needs to go after signInWithRedirect, otherwise the alert flickers and is hidden
  setTimeout(() => {
    dispatch(alert('Redirecting to login...'))
  })
}

export default login
