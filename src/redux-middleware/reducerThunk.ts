import _ from 'lodash'
import { Dispatch, Middleware } from 'redux'
import State from '../@types/State'

/** A Reducer thunk that can be dispatched as an action. */
export type ReducerThunk = (state: State) => State

// TODO: Fix type.
// For now, type curryReducer as a drop-in replacement for _.curryRight.
/** Curries a reducer and allows it to be dispatched with arguments. */
export const curryReducer = (<A extends any[]>(reducer: (state: State, ...args: A) => State) => {
  const curry = _.curryRight(reducer)
  return (...args: Parameters<typeof curry>) => {
    const curried = curry(...args)
    curried.curriedAction = {
      type: reducer.name,
      ...args[0],
    }
    return curried
  }
}) as _.CurryRight

/** Redux Middleware that allows curried reducers to be dispatched as actions. */
const reducerThunk: Middleware<any, State, Dispatch> = () => next => action =>
  next(
    // dispatch plain reducers that take no arguments
    typeof action === 'function' && action.toString().startsWith('state =>')
      ? { type: action.name }
      : // dispatch curried reducers using the payload stored in the curriedAction property
        typeof action === 'function' && action.curriedAction
        ? action.curriedAction
        : // otherwise pass the action on to the next middleware
          action,
  )

export default reducerThunk
