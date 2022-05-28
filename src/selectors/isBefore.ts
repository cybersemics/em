import { parentOf, head, headRank, headValue } from '../util'
import { getChildrenRanked } from '../selectors'
import { SimplePath, State } from '../@types'

/** Returns true if thoughtsA comes immediately before thoughtsB.
 * Assumes they have the same context.
 */
const isBefore = (state: State, simplePathA: SimplePath, simplePathB: SimplePath) => {
  const valueA = headValue(state, simplePathA)
  const rankA = headRank(state, simplePathA)
  const valueB = headValue(state, simplePathB)
  const rankB = headRank(state, simplePathB)
  const parentPathA = parentOf(simplePathA)
  const children = getChildrenRanked(state, head(parentPathA))

  if (children.length === 0 || valueA === undefined || valueB === undefined) {
    return false
  }

  const i = children.findIndex(child => child.value === valueB && child.rank === rankB)
  const prevSubthought = children[i - 1]
  return prevSubthought && prevSubthought.value === valueA && prevSubthought.rank === rankA
}

export default isBefore
