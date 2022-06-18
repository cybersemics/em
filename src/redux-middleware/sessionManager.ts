import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import { keepalive } from '../util/sessionManager'

/** Runs a throttled session keepalive on every action. */
const sessionManagerMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    keepalive()
    next(action)
  }
}

export default sessionManagerMiddleware
