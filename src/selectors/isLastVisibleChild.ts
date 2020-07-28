import { getChildrenSorted } from '../selectors'
import { contextOf, equalThoughtRanked, head, pathToContext } from '../util'
import { Path } from '../types'
import { State } from '../util/initialState'

/**
 * Finds if a thought is the last visible child in its context.
 */
const isLastVisibleChild = (state: State, path: Path) => {
  const context = pathToContext(path)
  const parentContext = contextOf(context)
  const children = getChildrenSorted(state, parentContext)
  return equalThoughtRanked(head(path), children[children.length - 1])
}

export default isLastVisibleChild
