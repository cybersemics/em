import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_PATH } from '../constants'
import { firstVisibleChild } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import nextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import once from '../util/once'
import parentOf from '../util/parentOf'

/** Gets the next context in a context view. */
const nextContext = (state: State, path: Path) => {
  // use rootedParentOf(path) instead of thought.parentId since we need to cross the context view
  const parent = getThoughtById(state, head(rootedParentOf(state, path)))
  const contexts = getContextsSortedAndRanked(state, parent.value)
  // find the thought in the context view
  const index = contexts.findIndex(cx => getThoughtById(state, cx.id).parentId === head(path))
  // get the next context
  const nextContextId = contexts[index + 1]?.id
  const nextContext = nextContextId ? getThoughtById(state, nextContextId) : null
  // if next does not exist (i.e. path is the last context), call nextThought on the parent and ignore the context view to move to the next uncle in the normal view
  return nextContext
    ? appendToPath(parentOf(path), nextContext.parentId)
    : nextThought(state, rootedParentOf(state, path), { ignoreChildren: true })
}

/** Gets the first context in a context view. */
const firstContext = (state: State, path: Path): Path | null => {
  const thought = getThoughtById(state, head(path))
  const contexts = getContextsSortedAndRanked(state, thought.value)

  // if context view is empty, move to the next thought
  const firstContext = getThoughtById(state, contexts[0]?.id)
  return contexts.length > 1
    ? appendToPath(path, firstContext.parentId)
    : nextThought(state, path, { ignoreChildren: true })
}

/** Returns the next uncle. */
const nextUncle = (state: State, path: Path) => {
  const pathParent = rootedParentOf(state, path)

  // the thought is a root child, then there is no uncle
  // otherwise, recursively call nextThought on the parent and prevent traversing children
  return isRoot(pathParent) ? null : nextThought(state, pathParent, { ignoreChildren: true })
}

/** Gets the next thought after a given path (default: cursor) whether it is a child, sibling, or uncle, and its respective contextChain.
 *
 * @param ignoreChildren Used to ignore the subthoughts if they have been traversed already. Useful for finding the next uncle.
 */
const nextThought = (state: State, path?: Path, { ignoreChildren }: { ignoreChildren?: boolean } = {}): Path | null => {
  path = path || state.cursor || HOME_PATH
  const pathParent = rootedParentOf(state, path)
  const showContexts = isContextViewActive(state, path)
  const showContextsParent = isContextViewActive(state, pathParent)

  const firstChild = !ignoreChildren ? firstVisibleChild(state, head(simplifyPath(state, path))) : null

  const onContextView = showContexts && !ignoreChildren
  const isEmptyContext = showContextsParent && !firstChild
  const sibling = once(() => nextSibling(state, path!))

  const next =
    // on a thought with the context view activated, move to the first context
    onContextView
      ? firstContext(state, path)
      : // in normal view, move to the first child
        firstChild
        ? appendToPath(path, firstChild.id)
        : // in the context view, move to the next context
          isEmptyContext
          ? nextContext(state, path)
          : // in normal view, move to the next sibling
            sibling()
            ? appendToPath(parentOf(path), sibling()!.id)
            : // otherwise, move to the next uncle
              nextUncle(state, path)

  return next
}

export default nextThought
