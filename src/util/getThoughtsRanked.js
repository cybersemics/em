import { store } from '../store.js'

// util
import {
  compareByRank,
  getThought,
  getThoughts,
  sort
} from '../util.js'

/** Generates children with their ranking. */
// TODO: cache for performance, especially if the app stays read-only
export const getThoughtsRanked = (context, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextIndex = contextIndex || store.getState().contextIndex
  return sort(
    getThoughts(context, thoughtIndex, contextIndex)
      .filter(child => child.value != null && getThought(child.value, thoughtIndex)),
    compareByRank
  )
}

// useful for debugging
window.getThoughtsRanked = getThoughtsRanked
