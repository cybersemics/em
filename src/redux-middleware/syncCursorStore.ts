import { ThunkMiddleware } from 'redux-thunk'
import State from '../@types/State'
import cursorStore from '../stores/cursor'
import hashPath from '../util/hashPath'

/**
 * Middleware that syncs the Redux cursor state with the cursor store.
 * This allows components to subscribe to cursor changes without causing re-renders.
 */
const syncCursorStoreMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    const state = getState()
    const currentCursor = state.cursor
    const currentCursorString = currentCursor ? hashPath(currentCursor) : null
    const oldCursorString = cursorStore.getState()

    // Update cursor store if it's different from Redux state (string comparison)
    if (oldCursorString !== currentCursorString) {
      cursorStore.update(currentCursorString)
    }
  }
}

export default syncCursorStoreMiddleware
