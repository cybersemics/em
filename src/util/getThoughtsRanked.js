import { store } from '../store'

// util
import { compareByRank } from './compareByRank.js'
import { getThought } from './getThought'
import { hashContext } from './hashContext'
import { sort } from './sort.js'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
export const getThoughtsRanked = (context, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextIndex = contextIndex || store.getState().contextIndex
  return sort(
    (contextIndex[hashContext(context)] || [])
      .filter(child => child.value != null && getThought(child.value, thoughtIndex)),
    compareByRank
  )
}

// useful for debugging
window.getThoughtsRanked = getThoughtsRanked
