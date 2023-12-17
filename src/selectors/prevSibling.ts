import Path from '../@types/Path'
import State from '../@types/State'
import Thought from '../@types/Thought'
import { getChildrenSorted } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import rootedParentOf from './rootedParentOf'

/** Gets the previous sibling of a thought according to its parent's sort preference. Supports normal view and context view. */
export const prevSibling = (
  state: State,
  path: Path,
  {
    showContexts: showContextsForced,
  }: {
    /** Explicitly specify if the thought is in a context view. If unspecified, the context view will be inferred. It only needs to be overridden in the special case of thoughts within cyclic contexts, e.g. prevSibling of a/~m/a/x by default detects that the simple parent of x, a/~m, has context view enabled, so it will by default return the previous context in a/~m. You can set showContexts:false to get the normal view sibling of x in a/m. */
    showContexts?: boolean
  } = {},
): Thought | null => {
  const id = head(path)

  // return null if the thought does not exist or is hidden
  const thought = getThoughtById(state, id)
  if (!thought || (!state.showHiddenThoughts && isAttribute(thought.value))) return null

  const parentPath = rootedParentOf(state, path)
  const showContexts = showContextsForced ?? isContextViewActive(state, parentPath)

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
