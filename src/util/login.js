import { store } from '../store.js'

// util
export const login = () => {
  const firebase = window.firebase
  const provider = new firebase.auth.GoogleAuthProvider()
  store.dispatch({ type: 'status', value: 'connecting' })
  firebase.auth().signInWithRedirect(provider)

  // for some reason a delay is needed and this needs to go after signInWithRedirect, otherwise the alert flickers and is hidden
  setTimeout(() => {
    store.dispatch({ type: 'alert', value: 'Redirecting to login...' })
  })
}
