// import * as firebaseProvider from '../data-providers/firebase'
// import { loadRemoteState } from '../action-creators'
// import { ROOT_TOKEN } from '../constants'

/** Updates local state with newly authenticated user. */
const userAuthenticated = (user, { readyToLoadRemoteState = Promise.resolve() } = {}) => async (dispatch, getState) => {

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

  // update thoughts
  // const thoughts = await firebaseProvider.getDescendantThoughts(user.uid, [ROOT_TOKEN])
  // await readyToLoadRemoteState
  // dispatch(loadRemoteState({ thoughts }))
  dispatch({ type: 'status', value: 'loaded' })
}

export default userAuthenticated
