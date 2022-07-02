import * as Firebase from '../@types/Firebase'
import Thunk from '../@types/Thunk'
import authenticate from '../action-creators/authenticate'
import error from '../action-creators/error'
import status from '../action-creators/status'
import { getUserRef } from '../util/getUserRef'
import storage from '../util/storage'

/** Updates local state with newly authenticated user. */
const userAuthenticated =
  (user: Firebase.User, { connected }: { connected?: boolean } = {}): Thunk =>
  (dispatch, getState) => {
    // save the user ref and uid into state
    const userRef = getUserRef({ ...getState(), user })

    if (!userRef) {
      throw new Error('Could not get userRef')
    }

    dispatch(authenticate({ value: true, user, connected }))

    // login automatically on page load
    requestAnimationFrame(() => {
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

    // only set status to loaded if we have connected
    // Firebase can be locally authenticated before being connected
    if (connected) {
      dispatch(status({ value: 'loaded' }))
    }
  }

export default userAuthenticated
