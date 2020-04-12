import { store } from '../store'
import {
  RANKED_ROOT,
} from '../constants'

// util
import { equalPath } from './equalPath'
import { hashContext } from './hashContext'
import { pathToContext } from './pathToContext'

// selectors
import { decodeThoughtsUrl, hashContextUrl } from '../selectors'

/** Set the url and history to the given thoughts */
// optional contextViews argument can be used during toggleContextViews when the state has not yet been updated
// defaults to URL contextViews
// SIDE EFFECTS: window.history
export const updateUrlHistory = (thoughtsRanked = RANKED_ROOT, { replace, contextViews } = {}) => {

  // if PWA, do not update URL as it causes a special browser navigation bar to appear
  // does not interfere with functionality since URL bar is not visible anyway and cursor is persisted locally
  // See Issue #212.
  if (window.navigator.standalone) {
    return
  }

  const decoded = decodeThoughtsUrl(store.getState(), window.location.pathname)
  const encoded = thoughtsRanked ? hashContext(thoughtsRanked) : null

  // if we are already on the page we are trying to navigate to (both in thoughts and contextViews), then NOOP
  if (equalPath(decoded.thoughtsRanked, thoughtsRanked) && decoded.contextViews[encoded] === (contextViews || decoded.contextViews)[encoded]) return

  try {
    window.history[replace ? 'replaceState' : 'pushState'](
      pathToContext(thoughtsRanked),
      '',
      hashContextUrl({ ...store.getState(), contextViews: contextViews || decoded.contextViews }, pathToContext(thoughtsRanked))
    )
  }
  catch (e) {
    // TODO: Fix SecurityError on mobile when ['', ''] gets encoded into '//'
    console.error(e)
  }
}
