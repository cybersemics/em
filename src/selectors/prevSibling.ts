import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { getChildrenSorted } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import head from '../util/head'
import headId from '../util/headId'
import isAttribute from '../util/isAttribute'
import { isContextStep } from '../util/pathStep'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import parentContextId from './parentContextId'
import rootedParentOf from './rootedParentOf'

/**
 * Gets the previous sibling of a thought according to its parent's sort preference. Supports normal view and context
 * view.
 *
 * In the context view the siblings are the other Lexeme contexts, and the returned Thought is a Lexeme context — append it
 * with `replaceHead`, not `appendToPath`, so the context-view step is preserved.
 */
export const prevSibling = (state: State, path: Path): Thought | null => {
  const id = headId(path)

  // return null if the thought does not exist or is hidden
  const thought = getThoughtById(state, id)
  if (!thought || (!state.showHiddenThoughts && isAttribute(thought.value))) return null

  // The path itself says whether this position was reached by crossing a context view, so there is nothing to infer
  // and no need for callers to override it.
  const showContexts = isContextStep(head(path))

  // siblings, including the current thought
  const parentPath = rootedParentOf(state, path)
  const contextViewThought = showContexts ? getThoughtById(state, parentContextId(state, parentPath)) : null
  const siblings = showContexts
    ? contextViewThought
      ? getContextsSortedAndRanked(state, contextViewThought.value)
      : []
    : getChildrenSorted(state, thought.parentId)

  const index = siblings.findIndex(child => child.id === id)

  if (index === -1) {
    const message = `Thought ${thought.value} with Path ${path} missing from ${
      showContexts ? 'context view' : 'child'
    } of ${thought.parentId}`
    console.error(message, { thought, siblings, parent: getThoughtById(state, thought.parentId) })
  }

  return siblings[index - 1] ?? null
}

export default prevSibling
