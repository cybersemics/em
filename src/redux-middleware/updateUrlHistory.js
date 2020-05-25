import _ from 'lodash'

// constants
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  equalPath,
  hashContext,
  isRoot,
  pathToContext,
} from '../util'

// selectors
import {
  decodeThoughtsUrl,
  hashContextUrl,
} from '../selectors'

// db
import {
  deleteCursor,
  updateCursor,
} from '../db'

/**
 * Sets the url and history to the given thoughts.
 * SIDE EFFECTS: window.history.
 *
 * @param contextViews   Optional argument can be used during toggleContextViews when the state has not yet been updated. Defaults to URL contextViews.
 */
const updateUrlHistory = (state, thoughtsRanked = RANKED_ROOT, { replace, contextViews } = {}) => {

  // if PWA, do not update URL as it causes a special browser navigation bar to appear
  // does not interfere with functionality since URL bar is not visible anyway and cursor is persisted locally
  // See Issue #212.
  if (window.navigator.standalone) return

  const decoded = decodeThoughtsUrl(state, window.location.pathname)
  const encoded = thoughtsRanked ? hashContext(thoughtsRanked) : null

  // convert decoded root thought to null cursor
  const thoughtsRankedDecoded = isRoot(decoded.thoughtsRanked) ? null : decoded.thoughtsRanked

  // if we are already on the page we are trying to navigate to (both in thoughts and contextViews), then NOOP
  if (equalPath(thoughtsRankedDecoded, thoughtsRanked) && decoded.contextViews[encoded] === (contextViews || state.contextViews)[encoded]) return

  const stateWithNewContextViews = { ...state, contextViews: contextViews || state.contextViews || decoded.contextViews }

  // persist the cursor so it can be restored after em is closed and reopened on the home page (see initialState)
  // ensure the location does not change through refreshes in standalone PWA mode
  if (thoughtsRanked) {
    updateCursor(hashContextUrl(stateWithNewContextViews, pathToContext(thoughtsRanked)))
      .catch(err => {
        throw new Error(err)
      })
  }
  else {
    deleteCursor()
      .catch(err => {
        throw new Error(err)
      })
  }

  try {
    window.history[replace ? 'replaceState' : 'pushState'](
      pathToContext(thoughtsRanked),
      '',
      hashContextUrl(stateWithNewContextViews, pathToContext(thoughtsRanked))
    )
  }
  catch (e) {
    // TODO: Fix SecurityError on mobile when ['', ''] gets encoded into '//'
    console.error(e)
  }
}

// throttles updateUrlHistory and passes it a fresh state when it is called.
const updateUrlHistoryDebounced = _.throttle(getState => {
  const state = getState()
  updateUrlHistory(state, state.cursor)
}, 100)

/** Updates the url history after the cursor has changed. The call to updateUrlHistory will short circuit if the cursor has not deviated from the current url. */
const updateUrlHistoryMiddleware = ({ getState, dispatch }) => {
  return next => action => {
    next(action)

    // wait until local state has loaded before updating the url
    if (!getState().isLoading) {
      updateUrlHistoryDebounced(getState)
    }
  }
}

export default updateUrlHistoryMiddleware
