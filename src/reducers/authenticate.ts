import _ from 'lodash'
import * as Firebase from '../@types/Firebase'
import State from '../@types/State'

interface Options {
  // used by the pullQueue to detect if the authenticated user is connected and thus able to pull
  // detected directly by the middleware, so not needed in State
  connected?: boolean
  value: boolean
  user?: Firebase.User
}

/** Sets the authenticated, autologin, and user when the user has been authenticated. Sets status to loading or disconnected depending on authentication value. */
const authenticate = (state: State, { value, user }: Options) => ({
  ...state,
  // autologin must be stored in localStorage separately since it is not modified on every authentication
  // assume firebase is connected and return to connected state
  authenticated: value,
  autologin: value || state.autologin,
  status: value ? 'loading' : 'disconnected',
  user,
})

export default _.curryRight(authenticate)
