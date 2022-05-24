import { getChildrenSortedById } from '../selectors'
import { head } from '../util'
import { SimplePath, State } from '../@types'
import rootedParentOf from './rootedParentOf'

/**
 * Finds if a thought is the last visible child in its context.
 */
const isLastVisibleChild = (state: State, simplePath: SimplePath) => {
  const parentId = head(rootedParentOf(state, simplePath))
  const children = getChildrenSortedById(state, parentId)
  return head(simplePath) === children[children.length - 1].id
}

export default isLastVisibleChild
