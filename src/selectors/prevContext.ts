import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import headId from '../util/headId'
import contextThoughtId from './contextThoughtId'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import getThoughtById from './getThoughtById'
import rootedParentOf from './rootedParentOf'

/** Calculates the previous context in a context view. Returns the Lexeme instance rendered at that position; build its Path with replaceHead so the context-view step is preserved. */
const prevContext = (state: State, path: Path): Thought | null => {
  // the context view is active on the parent path, and lists the contexts of the thought displayed there
  const contextViewThought = getThoughtById(state, contextThoughtId(state, rootedParentOf(state, path)))
  if (!contextViewThought) return null
  const contexts = getContextsSortedAndRanked(state, contextViewThought.value)
  const index = contexts.findIndex(cx => cx.id === headId(path))
  return index > 0 ? (contexts[index - 1] ?? null) : null
}

export default prevContext
