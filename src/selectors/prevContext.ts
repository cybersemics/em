import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import head from '../util/head'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import getThoughtById from './getThoughtById'
import rootedParentOf from './rootedParentOf'

/** Calculates the previous context in a context view. */
const prevContext = (state: State, path: Path): Thought | null => {
  // use rootedParentOf(path) instead of thought.parentId since we need to cross the context view
  const parent = getThoughtById(state, head(rootedParentOf(state, path)))
  const contexts = parent ? getContextsSortedAndRanked(state, parent.value) : []
  // find the thought in the context view
  const index = contexts.findIndex(cx => getThoughtById(state, cx.id)?.parentId === head(path))
  const context = contexts[index - 1]
  return context ? (getThoughtById(state, context.parentId) ?? null) : null
}

export default prevContext
