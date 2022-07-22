import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { HOME_PATH } from '../constants'
import { firstVisibleChildWithCursorCheck } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import getNextSibling from '../selectors/nextSibling'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import once from '../util/once'
import parentOf from '../util/parentOf'

/** Gets the next thought whether it is a child, sibling, or uncle, and its respective contextChain.
 *
 * @param ignoreChildren Used to ignore the subthoughts if they've been traversed already.
 */
const nextThought = (state: State, path: Path = HOME_PATH, ignoreChildren?: boolean): Path | null => {
  const thought = getThoughtById(state, head(path))
  const { value, rank } = thought
  const firstChild = !ignoreChildren && firstVisibleChildWithCursorCheck(state, path as SimplePath)

  /** Returns the next uncle. */
  const nextUncle = () => {
    const parentThought = getThoughtById(state, head(rootedParentOf(state, path)))

    return parentThought
      ? nextThought(state, rootedParentOf(state, path), true)
      : // reached root thought
        null
  }

  const nextSibling = once(() => getNextSibling(state, head(rootedParentOf(state, path)), value, rank))
  return firstChild
    ? appendToPath(path, firstChild.id)
    : nextSibling()
    ? appendToPath(parentOf(path), nextSibling().id)
    : nextUncle()
}

export default nextThought
