import { Dispatch, Middleware, UnknownAction } from 'redux'
import State from '../@types/State'
import testFlags from '../e2e/testFlags'

/** Redux Middleware for logging all actions when testFlags.logActions is set to true. Useful for remote debugging when Redux Developer Tools are not available. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loggerMiddleware: Middleware<any, State, Dispatch> = () => {
  return next => action => {
    next(action)

    if (testFlags.logActions) {
      console.info((action as UnknownAction).type, action)
    }
  }
}
export default loggerMiddleware
