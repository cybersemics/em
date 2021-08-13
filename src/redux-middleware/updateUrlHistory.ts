import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import { equalArrays, equalPath, hashContext, pathToContext } from '../util'
import { decodeThoughtsUrl, hashContextUrl } from '../selectors'
import { deleteCursor, updateCursor } from '../data-providers/dexie'
import { Context, Index, Path, State } from '../@types'

interface Options {
  // if true, replaces the last history state; otherwise pushes history state
  replace?: boolean

  // Used during toggleContextViews when the state has not yet been updated. Defaults to state.contextViews.
  contextViews?: Index<boolean>
}

/** Time delay (ms) to throttle the updateUrlHistory middleware so it is not executed on every action. */
const THROTTLE_MIDDLEWARE = 50

/** Time delay (ms) to throttle writing the cursor to the database which is slow and not done in a separate worker yet. */
const THROTTLE_DB_WRITE = 400

// The last path that is passed to updateUrlHistory that is different from the current path. Used to short circuit updateUrlHistory when the cursor hasn't changed without having to call decodeThoughtsUrl which is relatively slow.`
let pathPrev: Path | null = null

const updateCursorThrottled = _.throttle((state: State, context: Context) => {
  // persist the cursor so it can be restored after em is closed and reopened on the home page (see initialState)
  // ensure the location does not change through refreshes in standalone PWA mode
  const updateCursorPromise = state.cursor ? updateCursor(hashContextUrl(state, context)) : deleteCursor()
  updateCursorPromise.catch(err => {
    throw new Error(err)
  })
}, THROTTLE_DB_WRITE)

/**
 * Sets the url to the given Path.
 * SIDE EFFECTS: window.history.
 */
const updateUrlHistory = (state: State, path = HOME_PATH, { replace, contextViews }: Options = {}) => {
  // wait until local state has loaded before updating the url
  // nothing to update if the cursor hasn't changed
  if (state.isLoading || equalPath(pathPrev, path)) return
  pathPrev = path

  const decoded = decodeThoughtsUrl(state, window.location.pathname)
  const context = path ? pathToContext(path) : [HOME_TOKEN]
  const encoded = hashContext(context)

  // convert decoded root thought to null cursor
  const contextDecoded = decoded.path ? pathToContext(decoded.path) : [HOME_TOKEN]

  // if we are already on the page we are trying to navigate to (both in thoughts and contextViews), then NOOP
  if (
    equalArrays(contextDecoded, context) &&
    decoded.contextViews[encoded] === (contextViews || state.contextViews)[encoded]
  )
    return

  const stateWithNewContextViews = {
    ...state,
    contextViews: contextViews || state.contextViews || decoded.contextViews,
  }

  updateCursorThrottled(stateWithNewContextViews, context)

  // if PWA, do not update browser URL as it causes a special browser navigation bar to appear
  // does not interfere with functionality since URL bar is not visible anyway and cursor is persisted locally
  // See Issue #212.
  if (window.navigator.standalone) return

  // update browser history
  try {
    window.history[replace ? 'replaceState' : 'pushState'](
      // an incrementing ID to track back or forward browser actions
      (window.history.state || 0) + 1,
      '',
      hashContextUrl(stateWithNewContextViews, path ? context : [HOME_TOKEN]),
    )
  } catch (e) {
    // TODO: Fix SecurityError on mobile when ['', ''] gets encoded into '//'
    console.error(e)
  }
}

// throttle updateUrlHistory and passes it a fresh state when it is called.
const updateUrlHistoryThrottled = _.throttle(getState => {
  const state = getState()
  updateUrlHistory(state, state.cursor)
}, THROTTLE_MIDDLEWARE)

/** Updates the url history after the cursor has changed. The call to updateUrlHistory will short circuit if the cursor has not deviated from the current url. */
const updateUrlHistoryMiddleware: ThunkMiddleware<State> = ({ getState }) => {
  return next => action => {
    next(action)
    updateUrlHistoryThrottled(getState)
  }
}

export default updateUrlHistoryMiddleware
