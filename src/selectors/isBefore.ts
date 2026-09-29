import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { getChildrenRanked } from '../selectors/getChildren'
import head from '../util/head'
import rootedParentOf from './rootedParentOf'

/** Returns true if A comes immediately before B. */
const isBefore = (state: State, simplePathA: SimplePath, simplePathB: SimplePath) => {
  // rootedParentOf is required so that top-level thoughts resolve to the home context rather than an undefined parent
  const parentIdA = head(rootedParentOf(state, simplePathA))
  const parentIdB = head(rootedParentOf(state, simplePathB))
  if (parentIdA !== parentIdB) return false

  const children = getChildrenRanked(state, parentIdA)

  // find the thought immediately before B
  const i = children.findIndex(child => child.id === head(simplePathB))
  const prevSubthought = children[i - 1]

  // return true if A is the thought immediately before B
  return prevSubthought && prevSubthought.id === head(simplePathA)
}

export default isBefore
