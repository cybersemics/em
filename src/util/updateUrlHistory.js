// constants
import {
  RANKED_ROOT,
} from '../constants'

// util
import {
  equalPath,
  hashContext,
  pathToContext,
} from '../util'

// selectors
import {
  decodeThoughtsUrl,
  hashContextUrl,
} from '../selectors'

/**
 * Sets the url and history to the given thoughts.
 * SIDE EFFECTS: window.history.
 *
 * @param contextViews   Optional argument can be used during toggleContextViews when the state has not yet been updated. Defaults to URL contextViews.
 */
export const updateUrlHistory = (state, thoughtsRanked = RANKED_ROOT, { replace, contextViews } = {}) => {

  // if PWA, do not update URL as it causes a special browser navigation bar to appear
  // does not interfere with functionality since URL bar is not visible anyway and cursor is persisted locally
  // See Issue #212.
  if (window.navigator.standalone) {
    return
  }

  const decoded = decodeThoughtsUrl(state, window.location.pathname)
  const encoded = thoughtsRanked ? hashContext(thoughtsRanked) : null

  // if we are already on the page we are trying to navigate to (both in thoughts and contextViews), then NOOP
  if (equalPath(decoded.thoughtsRanked, thoughtsRanked) && decoded.contextViews[encoded] === (contextViews || decoded.contextViews)[encoded]) return

  try {
    window.history[replace ? 'replaceState' : 'pushState'](
      pathToContext(thoughtsRanked),
      '',
      hashContextUrl({ ...state, contextViews: contextViews || decoded.contextViews }, pathToContext(thoughtsRanked))
    )
  }
  catch (e) {
    // TODO: Fix SecurityError on mobile when ['', ''] gets encoded into '//'
    console.error(e)
  }
}
