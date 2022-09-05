import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { getChildrenSorted } from '../selectors/getChildren'
import head from '../util/head'
import rootedParentOf from './rootedParentOf'

/**
 * Finds if a thought is the last visible child in its context. O(n * log n) due to sort.
 */
const isLastVisibleChild = (state: State, simplePath: SimplePath) => {
  const parentId = head(rootedParentOf(state, simplePath))
  const children = getChildrenSorted(state, parentId)
  return head(simplePath) === children[children.length - 1].id
}

export default isLastVisibleChild
