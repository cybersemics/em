import { getChildrenWithRank } from './getChildrenWithRank.js'
import { contextOf } from './contextOf.js'
import { headKey } from './headKey.js'
import { headRank } from './headRank.js'

/** Returns true if itemsA comes immediately before itemsB
    Assumes they have the same context.
*/
export const isBefore = (thoughtsRankedA, thoughtsRankedB) => {

  const valueA = headKey(thoughtsRankedA)
  const rankA = headRank(thoughtsRankedA)
  const valueB = headKey(thoughtsRankedB)
  const rankB = headRank(thoughtsRankedB)
  const context = contextOf(thoughtsRankedA)
  const children = getChildrenWithRank(context)

  if (children.length === 0 || valueA === undefined || valueB === undefined) {
    return false
  }

  const i = children.findIndex(child => child.key === valueB && child.rank === rankB)
  const prevChild = children[i - 1]
  return prevChild && prevChild.key === valueA && prevChild.rank === rankA
}
