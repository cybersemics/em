import { headKey } from './headKey.js'
import { headRank } from './headRank.js'
import { rootedContextOf } from './rootedContextOf.js'
import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Gets an items's next sibling with its rank. */
export const nextSibling = itemsRanked => {
  const siblings = getChildrenWithRank(rootedContextOf(itemsRanked))
  const i = siblings.findIndex(child =>
    child.key === headKey(itemsRanked) && child.rank === headRank(itemsRanked)
  )
  return siblings[i + 1]
}
