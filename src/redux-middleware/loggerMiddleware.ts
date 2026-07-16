import { Dispatch, Middleware, UnknownAction } from 'redux'
import State from '../@types/State'
import testFlags from '../e2e/testFlags'
import debugLog from '../util/debugLog'

/** Redux Middleware for logging all actions. Logs to the console when testFlags.logActions is set (useful for e2e/remote debugging when Redux Developer Tools are not available), and captures every action into the persistent debugLog when it is enabled (see the Debug Logging setting). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loggerMiddleware: Middleware<any, State, Dispatch> = () => {
  return next => action => {
    next(action)

    const type = (action as UnknownAction).type

    if (testFlags.logActions) {
      console.info(type, action)
    }

    // Capture every dispatched action into the persistent rolling log. This middleware runs after the thunk
    // middleware, so `action` is always a resolved plain action with a `type`. The payload is stringified (and
    // truncated by debugLog's field cap) so large actions such as updateThoughts cannot blow the buffer.
    if (debugLog.isEnabled() && action && typeof action === 'object') {
      const { type: _type, ...payload } = action as UnknownAction
      let payloadStr: string
      try {
        payloadStr = JSON.stringify(payload)
      } catch {
        payloadStr = String(payload)
      }
      debugLog.log('action', { actionType: type ?? 'unknown', payload: payloadStr })
    }
  }
}
export default loggerMiddleware
