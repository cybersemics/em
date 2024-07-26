import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import { resetCommandState } from '../stores/commandStateStore'
import equalPath from '../util/equalPath'

/** Updates the command state after the cursor has changed. */
const updateCommandStateStore: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    const cursor = getState().cursor

    next(action)

    const nextCursor = getState().cursor

    if (!equalPath(cursor, nextCursor)) {
      resetCommandState()
    }
  }
}

export default updateCommandStateStore
