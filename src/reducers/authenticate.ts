import _ from 'lodash'
import { State } from '../util/initialState'
import { User } from '../types'

interface Options {
  value: string,
  user: User,
  userRef: any,
}

/** Sets the authenticated, autologin, loading, and user when the user has been authenticated. */
const authenticate = (state: State, { value, user, userRef }: Options) => ({
  ...state,
  // autologin must be stored in localStorage separately since it is not modified on every authentication
  // assume firebase is connected and return to connected state
  authenticated: value,
  autologin: value || state.autologin,
  status: value ? 'loading' : 'disconnected',
  user,
  userRef,
})

export default _.curryRight(authenticate)
