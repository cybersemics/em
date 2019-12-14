import { headKey } from './headKey.js'
import { headRank } from './headRank.js'
import { rootedContextOf } from './rootedContextOf.js'
import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Gets an thoughts's next sibling with its rank. */
export const nextSibling = thoughtsRanked => {
  const siblings = getChildrenWithRank(rootedContextOf(thoughtsRanked))
  const i = siblings.findIndex(child =>
    child.key === headKey(thoughtsRanked) && child.rank === headRank(thoughtsRanked)
  )
  return siblings[i + 1]
}
