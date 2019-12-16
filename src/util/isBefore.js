import { getChildrenWithRank } from './getChildrenWithRank.js'
import { contextOf } from './contextOf.js'
import { headValue } from './headValue.js'
import { headRank } from './headRank.js'

/** Returns true if thoughtsA comes immediately before thoughtsB
    Assumes they have the same context.
*/
export const isBefore = (thoughtsRankedA, thoughtsRankedB) => {

  const valueA = headValue(thoughtsRankedA)
  const rankA = headRank(thoughtsRankedA)
  const valueB = headValue(thoughtsRankedB)
  const rankB = headRank(thoughtsRankedB)
  const context = contextOf(thoughtsRankedA)
  const children = getChildrenWithRank(context)

  if (children.length === 0 || valueA === undefined || valueB === undefined) {
    return false
  }

  const i = children.findIndex(child => child.value === valueB && child.rank === rankB)
  const prevChild = children[i - 1]
  return prevChild && prevChild.value === valueA && prevChild.rank === rankA
}
