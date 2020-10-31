import { Action, AnyAction, Dispatch, Middleware } from 'redux'
import { State } from '../util/initialState'

type MultiAction<T = any> = AnyAction | T[]
type MultiMiddleware = Middleware<{}, State, Dispatch<Action>>

/** Redux Middleware that adds support for arrays of action. */
const multi: MultiMiddleware = ({ dispatch }) => next => action =>
  Array.isArray(action)
    ? action.filter(Boolean).map(dispatch)
    : next(action)

export default multi

/*
 * Overload to add array support to Redux's dispatch function.
 */
declare module 'redux' {
  export interface Dispatch<A extends Action = AnyAction> {
    <R = any>(multiAction: MultiAction): R,
  }
}
