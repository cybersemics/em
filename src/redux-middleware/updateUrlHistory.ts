import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { RANKED_ROOT, ROOT_TOKEN } from '../constants'
import { equalPath, hashContext, isRoot, pathToContext } from '../util'
import { decodeThoughtsUrl, hashContextUrl } from '../selectors'
import { deleteCursor, updateCursor } from '../db'
import { State } from '../util/initialState'
import { Index } from '../types'

/** Delay with which to debounce browser history update. */
const delay = 100

interface Options {
  replace?: unknown,
  contextViews?: Index<boolean>,
}

/**
 * Sets the url and history to the given thoughts.
 * SIDE EFFECTS: window.history.
 *
 * @param contextViews   Optional argument can be used during toggleContextViews when the state has not yet been updated. Defaults to URL contextViews.
 */
const updateUrlHistory = (state: State, path = RANKED_ROOT, { replace, contextViews }: Options = {}) => {

  const decoded = decodeThoughtsUrl(state, window.location.pathname)
  const encoded = path ? hashContext(pathToContext(path)) : null

  // convert decoded root thought to null cursor
  const pathDecoded = isRoot(decoded.path) ? null : decoded.path

  // if we are already on the page we are trying to navigate to (both in thoughts and contextViews), then NOOP
  if (equalPath(pathDecoded, path) && decoded.contextViews[encoded!] === (contextViews || state.contextViews)[encoded!]) return

  const stateWithNewContextViews = { ...state, contextViews: contextViews || state.contextViews || decoded.contextViews }

  // persist the cursor so it can be restored after em is closed and reopened on the home page (see initialState)
  // ensure the location does not change through refreshes in standalone PWA mode
  const updateCursorPromise = path
    ? updateCursor(hashContextUrl(stateWithNewContextViews, pathToContext(path)))
    : deleteCursor()
  updateCursorPromise
    .catch(err => {
      throw new Error(err)
    })

  // if PWA, do not update browser URL as it causes a special browser navigation bar to appear
  // does not interfere with functionality since URL bar is not visible anyway and cursor is persisted locally
  // See Issue #212.
  if (window.navigator.standalone) return

  // update browser history
  try {
    window.history[replace ? 'replaceState' : 'pushState'](
      path ? pathToContext(path) : [ROOT_TOKEN],
      '',
      hashContextUrl(stateWithNewContextViews, path ? pathToContext(path) : [ROOT_TOKEN])
    )
  }
  catch (e) {
    // TODO: Fix SecurityError on mobile when ['', ''] gets encoded into '//'
    console.error(e)
  }
}

// debounces updateUrlHistory and passes it a fresh state when it is called.
const updateUrlHistoryDebounced = _.throttle(getState => {
  const state = getState()
  updateUrlHistory(state, state.cursor)
}, delay)

/** Updates the url history after the cursor has changed. The call to updateUrlHistory will short circuit if the cursor has not deviated from the current url. */
const updateUrlHistoryMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)

    // wait until local state has loaded before updating the url
    if (!getState().isLoading) {
      updateUrlHistoryDebounced(getState)
    }
  }
}

export default updateUrlHistoryMiddleware
