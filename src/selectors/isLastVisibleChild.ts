import { getChildrenSorted } from '../selectors'
import { parentOf, head, pathToContext } from '../util'
import { SimplePath, State } from '../@types'

/**
 * Finds if a thought is the last visible child in its context.
 */
const isLastVisibleChild = (state: State, simplePath: SimplePath) => {
  const context = pathToContext(state, simplePath)
  const parentContext = parentOf(context)
  const children = getChildrenSorted(state, parentContext)
  return head(simplePath) === children[children.length - 1].id
}

export default isLastVisibleChild
