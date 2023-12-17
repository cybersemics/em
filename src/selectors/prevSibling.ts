import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { getChildrenSorted } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import head from '../util/head'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import rootedParentOf from './rootedParentOf'

/** Gets the previous sibling of a thought according to its parent's sort preference. Supports normal view and context view. */
export const prevSibling = (state: State, path: Path): Thought | null => {
  const id = head(path)
  const thought = getThoughtById(state, id)
  if (!thought) return null

  const parentPath = rootedParentOf(state, path)
  const showContexts = isContextViewActive(state, parentPath)

  // siblings, including the current thought
  const siblings = showContexts
    ? getContextsSortedAndRanked(state, getThoughtById(state, head(parentPath)).value)
    : getChildrenSorted(state, thought.parentId)

  // in context view, we need to match the context's parentId, since all context's ids refer to lexeme instances
  const index = siblings.findIndex(child => (showContexts ? child.parentId : child.id) === id)

  if (index === -1) {
    const message = `Thought ${thought.value} with Path ${path} missing from ${
      showContexts ? 'context view' : 'child'
    } of ${thought.parentId}`
    console.error(message, { thought, siblings, parent: getThoughtById(state, thought.parentId) })
    throw new Error(message)
  }

  const prev = siblings[index - 1]

  // in context view, we select then parent since prev again refers to the lexeme instance
  return prev ? (showContexts ? getThoughtById(state, prev.parentId) : prev) : null
}

export default prevSibling
