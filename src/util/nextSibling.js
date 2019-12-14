import { sigKey } from './sigKey.js'
import { sigRank } from './sigRank.js'
import { rootedIntersections } from './rootedIntersections.js'
import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Gets an items's next sibling with its rank. */
export const nextSibling = itemsRanked => {
  const siblings = getChildrenWithRank(rootedIntersections(itemsRanked))
  const i = siblings.findIndex(child =>
    child.key === sigKey(itemsRanked) && child.rank === sigRank(itemsRanked)
  )
  return siblings[i + 1]
}
