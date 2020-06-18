import * as firebaseProvider from '../data-providers/firebase'
import { ROOT_TOKEN } from '../constants'

/** Updates local state with newly authenticated user. */
const userAuthenticated = (user, { thoughtsLocalPromise } = {}) => async (dispatch, getState) => {

  const firebase = window.firebase

  // save the user ref and uid into state
  const userRef = firebase.database().ref('users/' + user.uid)

  dispatch({ type: 'authenticate', value: true, userRef, user })

  // login automatically on page load
  setTimeout(() => {
    localStorage.autologin = true
  })

  // update user information
  userRef.update({
    name: user.displayName,
    email: user.email
  }, err => {
    if (err) {
      dispatch({ type: 'error', value: err })
      console.error(err)
    }
  })

  // fetch root thoughts to kick off thoughtCache if there is nothing in the local db
  const thoughtsRemote = await firebaseProvider.getDescendantThoughts([ROOT_TOKEN], { maxDepth: 2 })
  const thoughtsLocal = await thoughtsLocalPromise

  dispatch({
    type: 'reconcile',
    thoughtsResults: [thoughtsLocal, thoughtsRemote]
  })

  dispatch({ type: 'status', value: 'loaded' })
}

export default userAuthenticated
