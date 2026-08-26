import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import head from '../util/head'
import { isContextStep } from '../util/pathStep'
import rootedParentOf from './rootedParentOf'
import simplifyPath from './simplifyPath'

/**
 * Returns the SimplePath of the thought that is displayed and edited at the head of a Path.
 *
 * In the context view this is the **parent context**: `a/m~/b` gives `b`, so editing that row renames the thought
 * `b` the user can see. Contrast simplifyPath, which gives the Lexeme context `b/m`. Outside the context view the two
 * agree, and the Path is returned by reference.
 */
const parentContextPath = (state: State, path: Path): SimplePath =>
  isContextStep(head(path)) ? rootedParentOf(state, simplifyPath(state, path)) : simplifyPath(state, path)

export default parentContextPath
