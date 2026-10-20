import Path from '../@types/Path'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { ABSOLUTE_TOKEN, HOME_TOKEN, ROOT_PARENT_ID } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import lastThoughtsFromContextChain from '../selectors/lastThoughtsFromContextChain'
import splitChain from '../selectors/splitChain'

/** The parents a Path may start from: the home and absolute contexts, whose children start a cursor, and the global root, whose children (e.g. the em context) start a settings path. */
const pathRoots: ThoughtId[] = [HOME_TOKEN, ABSOLUTE_TOKEN, ROOT_PARENT_ID]

/** Returns true if each loaded thought in the given ids is a child of the one before it, or of a root when it comes first. Thoughts that are not loaded cannot be checked and are assumed to be in place, since a cursor is routinely restored before its thoughts are pulled. */
const followsParentChain = (state: State, ids: ThoughtId[], { fromRoot }: { fromRoot: boolean }) =>
  ids.every((id, i) => {
    const thought = getThoughtById(state, id)
    if (!thought) return true
    return i === 0 ? !fromRoot || pathRoots.includes(thought.parentId) : thought.parentId === ids[i - 1]
  })

/** Returns true if a Path still leads to its thought: every thought on it is a child of the one before it, except where the Path crosses into a context view. A Path stops being valid when a thought on it is moved and the Path is not rebased onto the thought's new location. A cursor on such a Path names ancestors that no longer contain it, so nothing below the first missing ancestor renders. */
const isValidPath = (state: State, path: Path): boolean => {
  // Check the plain parent chain first, since it is cheap and passes for every Path that does not cross a context view.
  if (followsParentChain(state, path, { fromRoot: true })) return true

  // A Path that crosses a context view breaks the parent chain where it does: in a/m~/b/y, b is a context of m and y is
  // a child of the m in b rather than of b. Such a Path is valid if the part before the context view follows the
  // parent chain, and so does the SimplePath of the thought it leads to, which is what is rendered.
  const contextChain = splitChain(state, path)
  return (
    contextChain.length > 1 &&
    followsParentChain(state, contextChain[0], { fromRoot: true }) &&
    followsParentChain(state, lastThoughtsFromContextChain(state, contextChain), { fromRoot: true })
  )
}

export default isValidPath
