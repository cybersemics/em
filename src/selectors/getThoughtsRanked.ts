import { Child, Context } from '../types'
import { store } from '../store.js'

// util
import {
  compareByRank,
  getThought,
  hashContext,
  sort,
} from '../util'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
const getThoughtsRanked = (state: any, context: Context) =>
  sort(
    (state.contextIndex[hashContext(context)] || [])
      .filter((child: Child) => child.value != null && getThought(child.value, state.thoughtIndex)),
    compareByRank
  )

// useful for debugging
// @ts-ignore
window.getThoughtsRanked = getThoughtsRanked

export default getThoughtsRanked
