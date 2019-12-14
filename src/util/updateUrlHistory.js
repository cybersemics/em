import { store } from '../store.js'
import {
  RANKED_ROOT,
} from '../constants.js'

// util
import { unrank } from './unrank.js'
import { encodeItems } from './encodeItems.js'
import { encodeItemsUrl } from './encodeItemsUrl.js'
import { equalItemsRanked } from './equalItemsRanked.js'
import { decodeItemsUrl } from './decodeItemsUrl.js'

/** Set the url and history to the given items */
// optional contextViews argument can be used during toggleContextViews when the state has not yet been updated
// defaults to URL contextViews
// SIDE EFFECTS: window.history
export const updateUrlHistory = (itemsRanked = RANKED_ROOT, { replace, data = store.getState().data, contextViews } = {}) => {

  const decoded = decodeItemsUrl(window.location.pathname, data)
  const encoded = itemsRanked ? encodeItems(unrank(itemsRanked)) : null

  // if we are already on the page we are trying to navigate to (both in items and contextViews), then NOOP
  if (equalItemsRanked(decoded.itemsRanked, itemsRanked) && decoded.contextViews[encoded] === (contextViews || decoded.contextViews)[encoded]) return

  try {
    window.history[replace ? 'replaceState' : 'pushState'](
      unrank(itemsRanked),
      '',
      encodeItemsUrl(unrank(itemsRanked), { contextViews: contextViews || decoded.contextViews })
    )
  }
  catch (e) {
    // TODO: Fix SecurityError on mobile when ['', ''] gets encoded into '//'
  }
}
