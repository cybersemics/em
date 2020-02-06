import { store } from '../store.js'

// util
export const login = () => {
  const firebase = window.firebase
  const provider = new firebase.auth.GoogleAuthProvider()
  store.dispatch({ type: 'status', value: 'connecting' })
  firebase.auth().signInWithRedirect(provider)
}
