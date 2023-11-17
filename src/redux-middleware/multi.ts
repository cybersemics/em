import { Dispatch, Middleware } from 'redux'
import State from '../@types/State'
import nonNull from '../util/nonNull'

type MultiMiddleware = Middleware<any, State, Dispatch>

/** Redux Middleware that adds support for arrays of action. */
const multi: MultiMiddleware =
  ({ dispatch }) =>
  next =>
  action =>
    Array.isArray(action) ? action.filter(nonNull).map(dispatch) : next(action)

export default multi
