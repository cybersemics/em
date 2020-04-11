import { store } from '../store'

// util
import { compareByRank } from './compareByRank'
import { getThought } from '../selectors'
import { hashContext } from './hashContext'
import { sort } from './sort'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
export const getThoughtsRanked = (context, thoughtIndex, contextIndex) => {
  contextIndex = contextIndex || store.getState().contextIndex
  return sort(
    (contextIndex[hashContext(context)] || [])
      .filter(child => child.value != null && getThought(store.getState(), child.value)),
    compareByRank
  )
}

// useful for debugging
window.getThoughtsRanked = getThoughtsRanked
