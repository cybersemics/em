import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_PATH } from '../constants'
import displayedParentOf from '../selectors/displayedParentOf'
import { firstVisibleChild } from '../selectors/getChildren'
import getContextViewEntries from '../selectors/getContextViewEntries'
import isContextViewActive from '../selectors/isContextViewActive'
import nextSibling from '../selectors/nextSibling'
import simplifyPath from '../selectors/simplifyPath'
import appendToPath from '../util/appendToPath'
import equalPath from '../util/equalPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import once from '../util/once'
import parentOf from '../util/parentOf'

/** Gets the next context in a context view. */
const nextContext = (state: State, path: Path): Path | null => {
  const parentPath = displayedParentOf(state, path)
  const entries = getContextViewEntries(state, parentPath)
  const index = entries.findIndex(entry => equalPath(entry.path, path))
  return entries[index + 1]?.path || nextThought(state, parentPath, { ignoreChildren: true }) // eslint-disable-line @typescript-eslint/no-use-before-define
}

/** Gets the first context in a context view. */
const firstContext = (state: State, path: Path): Path | null => {
  const entries = getContextViewEntries(state, path)
  return entries.length > 1 ? entries[0].path : nextThought(state, path, { ignoreChildren: true }) // eslint-disable-line @typescript-eslint/no-use-before-define
}

/** Returns the next uncle. */
const nextUncle = (state: State, path: Path): Path | null => {
  const pathParent = displayedParentOf(state, path)

  // the thought is a root child, then there is no uncle
  // otherwise, recursively call nextThought on the parent and prevent traversing children
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return isRoot(pathParent) ? null : nextThought(state, pathParent, { ignoreChildren: true })
}

/** Gets the next thought after a given path (default: cursor) whether it is a child, sibling, or uncle, and its respective contextChain.
 *
 * @param ignoreChildren Used to ignore the subthoughts if they have been traversed already. Useful for finding the next uncle.
 */
const nextThought = (state: State, path?: Path, { ignoreChildren }: { ignoreChildren?: boolean } = {}): Path | null => {
  path = path || state.cursor || HOME_PATH
  const pathParent = displayedParentOf(state, path)
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
