import { equalThoughtRanked } from './equalThoughtRanked.js'
import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Gets thoughts's next sibling with its rank. */
export const nextSibling = (value, context, rank) => {
  const siblings = getChildrenWithRank(context)
  const i = siblings.findIndex(child => equalThoughtRanked(child, { value, rank}))
  return siblings[i + 1]
}
