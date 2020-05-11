import { getThoughtsRanked } from './getThoughtsRanked'
import { contextOf } from './contextOf'
import { headValue } from './headValue'
import { headRank } from './headRank'

/** Returns true if thoughtsA comes immediately before thoughtsB
    Assumes they have the same context.
 */
export const isBefore = (thoughtsRankedA, thoughtsRankedB) => {

  const valueA = headValue(thoughtsRankedA)
  const rankA = headRank(thoughtsRankedA)
  const valueB = headValue(thoughtsRankedB)
  const rankB = headRank(thoughtsRankedB)
  const context = contextOf(thoughtsRankedA)
  const children = getThoughtsRanked(context)

  if (children.length === 0 || valueA === undefined || valueB === undefined) {
    return false
  }

  const i = children.findIndex(child => child.value === valueB && child.rank === rankB)
  const prevSubthought = children[i - 1]
  return prevSubthought && prevSubthought.value === valueA && prevSubthought.rank === rankA
}
