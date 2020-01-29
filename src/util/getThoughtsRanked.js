import { store } from '../store.js'

// util
import { compareByRank } from './compareByRank.js'
import { getThought } from './getThought.js'
import { hashContext } from './hashContext.js'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
export const getThoughtsRanked = (context, thoughtIndex, contextIndex) => {
  thoughtIndex = thoughtIndex || store.getState().thoughtIndex
  contextIndex = contextIndex || store.getState().contextIndex
  const children = (contextIndex[hashContext(context)] || []) // eslint-disable-line fp/no-mutating-methods
    .filter(child => {
      return child.value != null && getThought(child.value, thoughtIndex)
    })
    .sort(compareByRank)

  return children
}
