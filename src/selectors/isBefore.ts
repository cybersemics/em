import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { getChildrenRanked } from '../selectors/getChildren'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** Returns true if A comes immediately before B. */
const isBefore = (state: State, simplePathA: SimplePath, simplePathB: SimplePath) => {
  const parentIdA = head(parentOf(simplePathA))
  const parentIdB = head(parentOf(simplePathB))
  if (parentIdA !== parentIdB) return false

  const children = getChildrenRanked(state, parentIdA)

  // find the thought immediately before B
  const i = children.findIndex(child => child.id === head(simplePathB))
  const prevSubthought = children[i - 1]

  // return true if A is the thought immediately before B
  return prevSubthought && prevSubthought.id === head(simplePathA)
}

export default isBefore
