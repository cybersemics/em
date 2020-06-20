import { contextOf, headRank, headValue } from '../util'
import { getThoughtsRanked } from '../selectors'
import { State } from '../util/initialState'
import { Path } from '../types'

/** Returns true if thoughtsA comes immediately before thoughtsB.
 * Assumes they have the same context.
 */
export default (state: State, thoughtsRankedA: Path, thoughtsRankedB: Path) => {

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
