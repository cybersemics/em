import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import { lastContextStepIndex, stepId } from '../util/pathStep'
import thoughtToPath from './thoughtToPath'

/**
 * Returns the SimplePath of the thought a Path describes, i.e. its position in the tree.
 *
 * In the context view this is the Lexeme instance: `a/m~/b` simplifies to `b/m`. For the thought that is *displayed*
 * there (`b`), use contextThoughtPath.
 *
 * Only the last context-view boundary matters — everything after it is an ordinary chain of children within one
 * context, and is carried across verbatim rather than looked up. That keeps a *constructed* Path meaningful: a
 * reducer can build a destination such as `a/m~/b/<new category>/y` before the thoughts have moved, and get back
 * `b/m/<new category>/y` rather than wherever `y` happens to live right now.
 *
 * A Path that crosses no context view is returned by reference, which keeps appendToPathMemo and the React.memo
 * comparisons in VirtualThought from being defeated by a fresh array on every call.
 */
const simplifyPath = (state: State, path: Path): SimplePath => {
  const i = lastContextStepIndex(path)
  if (i === -1) return path as SimplePath
  return appendToPath(thoughtToPath(state, stepId(path[i])), ...path.slice(i + 1).map(stepId))
}

export default simplifyPath
