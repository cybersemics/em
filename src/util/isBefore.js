import { getChildrenWithRank } from './getChildrenWithRank.js'
import { intersections } from './intersections.js'
import { sigKey } from './sigKey.js'
import { sigRank } from './sigRank.js'

/** Returns true if itemsA comes immediately before itemsB
    Assumes they have the same context.
*/
export const isBefore = (itemsRankedA, itemsRankedB) => {

  const valueA = sigKey(itemsRankedA)
  const rankA = sigRank(itemsRankedA)
  const valueB = sigKey(itemsRankedB)
  const rankB = sigRank(itemsRankedB)
  const context = intersections(itemsRankedA)
  const children = getChildrenWithRank(context)

  if (children.length === 0 || valueA === undefined || valueB === undefined) {
    return false
  }

  const i = children.findIndex(child => child.key === valueB && child.rank === rankB)
  const prevChild = children[i - 1]
  return prevChild && prevChild.key === valueA && prevChild.rank === rankA
}
