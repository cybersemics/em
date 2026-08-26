import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_PATH } from '../constants'
import { firstVisibleChild } from '../selectors/getChildren'
import getContextsSortedAndRanked from '../selectors/getContextsSortedAndRanked'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import nextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath, { appendContextStep } from '../util/appendToPath'
import headId from '../util/headId'
import isRoot from '../util/isRoot'
import once from '../util/once'
import { replaceHead } from '../util/pathStep'
import parentContextId from './parentContextId'

/** Gets the first context in a context view. */
const firstContext = (state: State, path: Path): Path | null => {
  const thought = getThoughtById(state, parentContextId(state, path))
  const contexts = thought ? getContextsSortedAndRanked(state, thought.value) : []

  // if context view is empty, move to the next thought
  return contexts.length > 1 && contexts[0]
    ? appendContextStep(path, contexts[0].id)
    : nextThought(state, path, { ignoreChildren: true }) // eslint-disable-line @typescript-eslint/no-use-before-define
}

/** Returns the next uncle. */
const nextUncle = (state: State, path: Path): Path | null => {
  const pathParent = rootedParentOf(state, path)

  // the thought is a root child, then there is no uncle
  // otherwise, recursively call nextThought on the parent and prevent traversing children
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return isRoot(pathParent) ? null : nextThought(state, pathParent, { ignoreChildren: true })
}

/** Gets the next thought after a given path (default: cursor) whether it is a child, sibling, or uncle.
 *
 * @param ignoreChildren Used to ignore the subthoughts if they have been traversed already. Useful for finding the next uncle.
 */
const nextThought = (state: State, path?: Path, { ignoreChildren }: { ignoreChildren?: boolean } = {}): Path | null => {
  path = path || state.cursor || HOME_PATH
  const onContextView = isContextViewActive(state, path) && !ignoreChildren

  // children come from the thought the path lands on, which in the context view is the Lexeme context
  const firstChild = !ignoreChildren ? firstVisibleChild(state, headId(path)) : null

  // nextSibling reads the context view off the path's own head step, so it returns the next context when the path is a
  // context row and the next child otherwise
  const sibling = once(() => nextSibling(state, path!))

  return (
    // on a thought with the context view activated, move to the first context
    onContextView
      ? firstContext(state, path)
      : // move to the first child
        firstChild
        ? appendToPath(path, firstChild.id)
        : // move to the next sibling, i.e. the next context when in a context view
          sibling()
          ? replaceHead(path, sibling()!.id)
          : // otherwise, move to the next uncle
            nextUncle(state, path)
  )
}

export default nextThought
