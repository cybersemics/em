import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

interface Options {
  // used by the pullQueue to detect if the authenticated user is connected and thus able to pull
  // detected directly by the middleware, so not needed in State
  connected?: boolean
  value: boolean
}

/** Sets the authenticated, autologin, and user when the user has been authenticated. Sets status to loading or disconnected depending on authentication value. */
const authenticate = (state: State, { value }: Options) => ({
  ...state,
  // autologin must be stored in localStorage separately since it is not modified on every authentication
  // assume we are connected and return to connected state
  authenticated: value,
  autologin: value || state.autologin,
  status: value ? 'loading' : 'disconnected',
})

/** Action-creator for authenticate. */
export const authenticateActionCreator =
  (payload: Parameters<typeof authenticate>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'authenticate', ...payload })

export default _.curryRight(authenticate)
