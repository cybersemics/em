import { getChildrenWithRank } from './getChildrenWithRank.js'
import { contextOf } from './contextOf.js'
import { headKey } from './headKey.js'
import { headRank } from './headRank.js'

/** Returns true if itemsA comes immediately before itemsB
    Assumes they have the same context.
*/
export const isBefore = (itemsRankedA, itemsRankedB) => {

  const valueA = headKey(itemsRankedA)
  const rankA = headRank(itemsRankedA)
  const valueB = headKey(itemsRankedB)
  const rankB = headRank(itemsRankedB)
  const context = contextOf(itemsRankedA)
  const children = getChildrenWithRank(context)

  if (children.length === 0 || valueA === undefined || valueB === undefined) {
    return false
  }

  const i = children.findIndex(child => child.key === valueB && child.rank === rankB)
  const prevChild = children[i - 1]
  return prevChild && prevChild.key === valueA && prevChild.rank === rankA
}
