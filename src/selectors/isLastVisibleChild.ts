import { getThoughtsRanked, hasChild } from '../selectors'
import { contextOf, equalThoughtRanked, head, isFunction, pathToContext, unroot } from '../util'
import { Path } from '../types'
import { State } from '../util/initialState'

/**
 * Finds if the cursor is the last visible child in its context.
 */
const isLastVisibleChild = (state: State, path: Path) => {

  const parentContext = contextOf(pathToContext(path))
  const children = getThoughtsRanked(state, contextOf(path))

  const filteredChildren = children.filter(child => {
    return state.showHiddenThoughts ||
      // exclude meta thoughts when showHiddenThoughts is off
      (!isFunction(child.value) && !hasChild(state, unroot(parentContext.concat(child.value)), '=hidden'))
  })

  return equalThoughtRanked(head(path), filteredChildren[filteredChildren.length - 1])
}

export default isLastVisibleChild
