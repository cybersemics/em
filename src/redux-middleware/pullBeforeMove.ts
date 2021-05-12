import { ThunkMiddleware } from 'redux-thunk'
import pull from '../action-creators/pull'
import { isPending, pathExists, simplifyPath } from '../selectors'
import { hashContext, head, parentOf, pathToContext } from '../util'
import { State } from '../util/initialState'

/**
 * Middleware that fetches any pending descendants before a thought-move operation.
 */
const pullBeforeMove: ThunkMiddleware<State> = ({ getState, dispatch }) => {

  return next => async action => {

    if (action.type === 'existingThoughtMove') {
      const state = getState()

      const oldContext = pathToContext(simplifyPath(state, action.oldPath))

      const newContext = pathToContext(simplifyPath(state, action.newPath))

      const updatedNewContext = [...parentOf(newContext), head(oldContext)]
      const conflictedPath = pathExists(state, updatedNewContext)

      const isNewContextPending = conflictedPath && isPending(state, newContext)
      if (isNewContextPending) {
        const toPull = { [hashContext(newContext)]: newContext }
        await dispatch(pull(toPull, { maxDepth: Infinity }))
      }
    }
    next(action)

  }
}

export default pullBeforeMove
