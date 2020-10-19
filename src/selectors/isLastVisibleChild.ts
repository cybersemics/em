import { getChildrenSorted } from '../selectors'
import { contextOf, equalThoughtRanked, head, pathToContext } from '../util'
import { State } from '../util/initialState'
import { SimplePath } from '../types'

/**
 * Finds if a thought is the last visible child in its context.
 */
const isLastVisibleChild = (state: State, simplePath: SimplePath) => {
  const context = pathToContext(simplePath)
  const parentContext = contextOf(context)
  const children = getChildrenSorted(state, parentContext)
  return equalThoughtRanked(head(simplePath), children[children.length - 1])
}

export default isLastVisibleChild
