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
import parentOf from '../util/parentOf'

/** Gets the next thought in a context view. */
const nextContext = (state: State, path: Path) => {
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

  // if context view is empty, move to the next thought
  const firstContext = getThoughtById(state, contextIds[0])
  return contextIds.length > 1
    ? appendToPath(path, firstContext.parentId)
    : nextThought(state, path, { ignoreChildren: true })
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
  const pathParent = rootedParentOf(state, path)
  const showContexts = isContextViewActive(state, path)
  const showContextsParent = isContextViewActive(state, pathParent)

  // cursor is on the context view thought
  if (showContexts && !ignoreChildren) {
    return firstThoughtInContextView(state, path)
  }

  const firstChild = !ignoreChildren
    ? firstVisibleChildWithCursorCheck(state, (showContextsParent ? pathParent : path) as SimplePath)
    : null

  /** Returns the next uncle. */
  const nextUncle = () => {
    const parentThought = getThoughtById(state, head(pathParent))

    return parentThought
      ? nextThought(state, pathParent, { ignoreChildren: true })
      : // reached root thought
        null
  }

  /** Gets the next sibling after the path. */
  const nextSibling = () => getNextSibling(state, head(pathParent), thought.value, thought.rank)

  const isEmptyContext = showContextsParent && !firstChild

  const next =
    // in normal view, move to the first child
    firstChild
      ? appendToPath(path, firstChild.id)
      : // in the context view, move to the next context
      isEmptyContext
      ? nextContext(state, path)
      : // in normal view, move to the next thought
      nextSibling()
      ? appendToPath(parentOf(path), nextSibling().id)
      : // otherwise, move to the next uncle
        nextUncle()

  return next
}

export default nextThought
