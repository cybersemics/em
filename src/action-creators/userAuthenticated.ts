import { HOME_TOKEN } from '../constants'
import { getUserRef, hashContext } from '../util'
import { authenticate, error, pull, status } from '../action-creators'
import { Firebase, Thunk } from '../@types'
import { storage } from '../util/storage'

/** Updates local state with newly authenticated user. */
const userAuthenticated =
  (user: Firebase.User): Thunk =>
  (dispatch, getState) => {
    // save the user ref and uid into state
    const userRef = getUserRef({ ...getState(), user })

    if (!userRef) {
      throw new Error('Could not get userRef')
    }

    dispatch(authenticate({ value: true, user }))

    // login automatically on page load
    setTimeout(() => {
      storage.setItem('autologin', 'true')
    })

    // update user information
    userRef.update(
      {
        name: user.displayName,
        email: user.email,
      },
      (err: Error | null) => {
        if (err) {
          dispatch(error({ value: err.message }))
          console.error(err)
        }
      },
    )

    dispatch(status({ value: 'loaded' }))

    // Thoughts are previously loaded from local storage, which turns off pending on the root context, causing pull to short circuit and remote thoughts to not be loaded.
    // Force a pull once authenticated to make remote thoughts load initially. Afterwards, just watch for subscription updates.
    dispatch(pull({ [hashContext([HOME_TOKEN])]: [HOME_TOKEN] }, { force: true }))
  }

export default userAuthenticated
