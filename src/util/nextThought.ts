import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { HOME_PATH } from '../constants'
import { firstVisibleChildWithCursorCheck } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import getNextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import once from '../util/once'
import parentOf from '../util/parentOf'

/** Gets the next thought in a context view. */
const nextThoughtInContextView = (state: State, path: Path) => {
  // use rootedParentOf(path) instead of thought.parentId since we need to cross the context view
  const parent = getThoughtById(state, head(rootedParentOf(state, path)))
  const contextIds = getContexts(state, parent.value)
  // find the thought in the context view
  const index = contextIds.findIndex(id => getThoughtById(state, id).parentId === head(path))
  // get the next context
  const nextContextId = contextIds[index + 1]
  const nextContext = nextContextId ? getThoughtById(state, nextContextId) : null
  // if next does not exist (i.e. path is the last context), call nextThought on the parent and ignore the context view to move to the next uncle in the normal view
  return nextContext
    ? appendToPath(parentOf(path), nextContext.parentId)
    : nextThought(state, rootedParentOf(state, path), { ignoreChildren: true })
}

/** Gets the first thought in a context view. */
const firstThoughtInContextView = (state: State, path: Path): Path | null => {
  const thought = getThoughtById(state, head(path))
  const contextIds = getContexts(state, thought.value)
  // we can assume that there is at least one context since the context view is activated
  const firstContext = getThoughtById(state, contextIds[0])
  return appendToPath(path, firstContext.parentId)
}

/** Gets the next thought whether it is a child, sibling, or uncle, and its respective contextChain.
 *
 * @param ignoreChildren Used to ignore the subthoughts if they have been traversed already. Useful for finding the next uncle.
 */
const nextThought = (
  state: State,
  path: Path = HOME_PATH,
  { ignoreChildren }: { ignoreChildren?: boolean } = {},
): Path | null => {
  const thought = getThoughtById(state, head(path))

  // cursor is on the context view thought
  if (isContextViewActive(state, path) && !ignoreChildren) {
    return firstThoughtInContextView(state, path)
  }
  // cursor is in the context view
  else if (isContextViewActive(state, rootedParentOf(state, path))) {
    return nextThoughtInContextView(state, path)
  }

  const { value, rank } = thought
  const firstChild = !ignoreChildren && firstVisibleChildWithCursorCheck(state, path as SimplePath)

  /** Returns the next uncle. */
  const nextUncle = () => {
    const parentThought = getThoughtById(state, head(rootedParentOf(state, path)))

    return parentThought
      ? nextThought(state, rootedParentOf(state, path), { ignoreChildren: true })
      : // reached root thought
        null
  }

  const nextSibling = once(() => getNextSibling(state, head(rootedParentOf(state, path)), value, rank))
  const next = firstChild
    ? appendToPath(path, firstChild.id)
    : nextSibling()
    ? appendToPath(parentOf(path), nextSibling().id)
    : nextUncle()

  return next
}

export default nextThought
