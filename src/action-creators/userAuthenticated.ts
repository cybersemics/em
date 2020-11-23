import { getUserRef } from '../util'
import { ActionCreator, User } from '../types'

/** Updates local state with newly authenticated user. */
const userAuthenticated = (user: User): ActionCreator => async (dispatch, getState) => {

  // save the user ref and uid into state
  const userRef = getUserRef({ ...getState(), user })

  if (!userRef) {
    throw new Error('Could not get userRef')
  }

  dispatch({ type: 'authenticate', value: true, user })

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

  dispatch({ type: 'status', value: 'loaded' })
}

export default userAuthenticated
