import { getUserRef } from '../util'
import { authenticate, error, status } from '../action-creators'
import { Thunk, User } from '../types'

/** Updates local state with newly authenticated user. */
const userAuthenticated = (user: User): Thunk => (dispatch, getState) => {

  // save the user ref and uid into state
  const userRef = getUserRef({ ...getState(), user })

  if (!userRef) {
    throw new Error('Could not get userRef')
  }

  dispatch(authenticate({ value: true, user }))

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
      dispatch(error({ value: err.message }))
      console.error(err)
    }
  })

  dispatch(status({ value: 'loaded' }))
}

export default userAuthenticated
