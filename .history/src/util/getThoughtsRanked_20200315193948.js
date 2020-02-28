import { store } from '../store.js'

// util
import { compareByRank } from './compareByRank.js'
import { getThought } from './getThought.js'
import { hashContext } from './hashContext.js'
import { sort } from './sort.js'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
export const getThoughtsRanked = (context, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextIndex = contextIndex || store.getState().contextIndex
  console.log(hashContext(context))
  console.log(contextIndex)
  console.log(contextIndex[hashContext(context)])
  return sort(
    ([])
      .filter(child => child.value != null && getThought(child.value, thoughtIndex)),
    compareByRank
  )
}

// useful for debugging
window.getThoughtsRanked = getThoughtsRanked
