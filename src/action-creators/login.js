import alert from '../action-creators/alert'

/** Redirects the user to the Firebase login page. */
const login = () => dispatch => {
  const firebase = window.firebase
  const provider = new firebase.auth.GoogleAuthProvider()
  dispatch({ type: 'status', value: 'connecting' })
  firebase.auth().signInWithRedirect(provider)

  // for some reason a delay is needed and this needs to go after signInWithRedirect, otherwise the alert flickers and is hidden
  setTimeout(() => {
    alert('Redirecting to login...')
  })
}

export default login
