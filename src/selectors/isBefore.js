// util
import {
  contextOf,
  headRank,
  headValue,
} from '../util'

// selectors
import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Returns true if thoughtsA comes immediately before thoughtsB
    Assumes they have the same context.
*/
export default (state, thoughtsRankedA, thoughtsRankedB) => {

  const valueA = headValue(thoughtsRankedA)
  const rankA = headRank(thoughtsRankedA)
  const valueB = headValue(thoughtsRankedB)
  const rankB = headRank(thoughtsRankedB)
  const context = contextOf(thoughtsRankedA)
  const children = getThoughtsRanked(state, context)

  if (children.length === 0 || valueA === undefined || valueB === undefined) {
    return false
  }

  const i = children.findIndex(child => child.value === valueB && child.rank === rankB)
  const prevSubthought = children[i - 1]
  return prevSubthought && prevSubthought.value === valueA && prevSubthought.rank === rankA
}
