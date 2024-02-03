import { Dispatch, Middleware } from 'redux'
import State from '../@types/State'

/* This middleware exists to prevent the easy mistake of importing a reducer instead of an action-creator. A runtime check is needed because the type system cannot distinguish between a reducer and a thunk. This is because:

 1. Most reducers are curried with _.curryRight.
 2. Curried functions can accept no arguments.
 3. Typescript accepts a function with no arguments as a thunk, regardless of the thunk signature.

  See:
    https://stackoverflow.com/a/59325185/480608
    https://www.typescriptlang.org/docs/handbook/type-compatibility.html#comparing-two-functions
*/

/** Redux Middleware that prevents accidentally passing a reducer to the dispatch function. */
const doNotDispatchReducer: Middleware<any, State, Dispatch> = () => next => action => {
  if (typeof action === 'function' && action.toString().startsWith('(state,')) {
    throw new Error('Dispatching a reducer is not allowed. Did you mean to use an action-creator?')
  }
  return next(action)
}

export default doNotDispatchReducer
