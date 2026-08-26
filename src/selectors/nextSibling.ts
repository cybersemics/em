import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenSorted } from '../selectors/getChildren'
import head from '../util/head'
import headId from '../util/headId'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import { isContextStep } from '../util/pathStep'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import getThoughtById from './getThoughtById'
import parentContextId from './parentContextId'
import rootedParentOf from './rootedParentOf'

/**
 * Gets the next sibling after a thought according to its parent's sort preference. Supports normal view and context
 * view; a ThoughtId argument is always resolved in normal view since it carries no context-view information.
 *
 * In the context view the siblings are the other Lexeme contexts, and the returned Thought is a Lexeme context — append it
 * with `replaceHead`, not `appendToPath`, so the context-view step is preserved.
 */
const nextSibling = (state: State, idOrPath: ThoughtId | Path): Thought | null => {
  const id = typeof idOrPath === 'string' ? (idOrPath as ThoughtId) : headId(idOrPath)
  if (isRoot([id])) return null

  // return null if the thought does not exist or is hidden
  const thought = getThoughtById(state, id)
  if (!thought || (!state.showHiddenThoughts && isAttribute(thought.value))) return null

  const showContexts = typeof idOrPath !== 'string' && isContextStep(head(idOrPath))
  const contextViewThought =
    showContexts && typeof idOrPath !== 'string'
      ? getThoughtById(state, parentContextId(state, rootedParentOf(state, idOrPath)))
      : null
  const siblings = showContexts
    ? contextViewThought
      ? getContextsSortedAndRanked(state, contextViewThought.value)
      : []
    : getChildrenSorted(state, thought.parentId)

  const index = siblings.findIndex(child => child.id === id)

  if (index === -1) {
    const message = `Thought ${thought.value} with ${
      typeof idOrPath === 'string' ? 'id' : 'Path'
    } ${idOrPath} missing from ${showContexts ? 'context view' : 'children'} of ${thought.parentId}`
    console.error(message, { thought, siblings, parent: getThoughtById(state, thought.parentId) })
  }

  return siblings[index + 1] || null
}

export default nextSibling
