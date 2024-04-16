import _ from 'lodash'
import { ThunkMiddleware } from 'redux-thunk'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import * as selection from '../device/selection'
import decodeThoughtsUrl from '../selectors/decodeThoughtsUrl'
import { hasChildren } from '../selectors/getChildren'
import isContextViewActive from '../selectors/isContextViewActive'
import storageModel from '../stores/storageModel'
import equalArrays from '../util/equalArrays'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isRoot from '../util/isRoot'

interface Options {
  // if true, replaces the last history state; otherwise pushes history state
  replace?: boolean

  // Used during toggleContextViews when the state has not yet been updated. Defaults to state.contextViews.
  contextViews?: Index<boolean>
}

/** Time delay (ms) to throttle the updateUrlHistory middleware so it is not executed on every action. */
const THROTTLE_MIDDLEWARE = 100

/** Only write the cursor every 100 ms. */
const SAVE_CURSOR_THROTTLE = 100

// The last path that is passed to updateUrlHistory that is different from the current path. Used to short circuit updateUrlHistory when the cursor hasn't changed without having to call decodeThoughtsUrl which is relatively slow.`
let pathPrev: Path | null = null

/** Encodes context array into a URL. */
const pathToUrl = (state: State, path: Path) => {
  if (!path || isRoot(path)) return '/'

  const userId = window.location.pathname.split('/')[1] || '~'
  const queryString = window.location.search
  const thoughtsEncoded = path
    // Note: Since thouhtId is a uuid, so they are url safe
    .map((thoughtId, i) => thoughtId + (isContextViewActive(state, path.slice(0, i + 1) as Path) ? '~' : ''))
    .join('/')

  return `/${userId}/${thoughtsEncoded}${queryString}`
}

/** Persist the cursor so it can be restored after em is closed and reopened on the home page (see initialState). Ensure the location does not change through refreshes in standalone PWA mode. */
// TODO: Restore cursor after thoughts replicate
const saveCursor = _.throttle(
  (state: State, path: Path) => {
    if (state.cursor) {
      storageModel.set('cursor', { path, offset: selection.offsetThought() })
    } else {
      storageModel.remove('cursor')
    }
  },
  SAVE_CURSOR_THROTTLE,
  {
    leading: false,
  },
)

/**
 * Sets the url to the given Path. Encodes and persists the cursor to local storage.
 * SIDE EFFECTS: window.history.
 */
const updateUrlHistory = (state: State, path: Path, { replace, contextViews }: Options = {}) => {
  // wait until local state has loaded before updating the url
  if (state.isLoading) return

  // if the welcome modal has not been completed and there are no root thoughts, then we can assume that IndexedDB was cleared and clear the obsolete path encoded in the url
  if (
    state.showModal !== 'welcome' &&
    typeof window !== 'undefined' &&
    /\/~\/./.test(window.location.pathname) &&
    !hasChildren(state, HOME_TOKEN)
  ) {
    // preserve the query string
    const url = window.location.search ? `/~/${window.location.search}` : '/'
    window.history.pushState({}, '', url)
  }

  // nothing to update if the cursor has not changed
  if (state.isLoading || equalPath(pathPrev, path)) return
  pathPrev = path

  const decoded = decodeThoughtsUrl(state)
  const encoded = head(path || HOME_PATH)

  // convert decoded root thought to null cursor
  const decodedPath = decoded.path || [HOME_TOKEN]

  // if we are already on the page we are trying to navigate to (both in thoughts and contextViews), then NOOP
  if (equalArrays(path, decodedPath) && decoded.contextViews[encoded] === (contextViews || state.contextViews)[encoded])
    return

  const stateWithNewContextViews = {
    ...state,
    contextViews: contextViews || state.contextViews || decoded.contextViews,
  }

  saveCursor(stateWithNewContextViews, path)

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
      pathToUrl(stateWithNewContextViews, path || [HOME_TOKEN]),
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
