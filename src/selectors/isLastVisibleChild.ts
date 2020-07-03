// util
import {
  contextOf,
  equalThoughtRanked,
  head,
  isFunction,
  pathToContext,
  unroot,
} from '../util'

// selectors
import { getThoughtsRanked, hasChild } from '../selectors'
import { Path } from '../types'
import { State } from '../util/initialState'

/**
 * Finds id the cursor is the last visible child in it's context.
 */
const isLastVisibleChild = (state: State, path: Path) => {

  const parentContext = contextOf(pathToContext(path))
  const children = getThoughtsRanked(state, contextOf(path))

  const filteredChildren = children.filter(child => {
    return state.showHiddenThoughts ||
      // exclude meta thoughts when showHiddenThoughts is off
      (!isFunction(child.value) && !hasChild(state, unroot(parentContext.concat(child.value)), '=hidden'))
  })

  const index = filteredChildren.findIndex(child => equalThoughtRanked(head(path), child))

  return index === filteredChildren.length - 1
}

export default isLastVisibleChild
