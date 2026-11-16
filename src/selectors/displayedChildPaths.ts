import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import { getChildrenSorted } from './getChildren'
import getContextViewEntries from './getContextViewEntries'
import isContextViewActive from './isContextViewActive'
import simplifyPath from './simplifyPath'

/** Gets selectable children in the displayed hierarchy while retaining real occurrence identity. */
const displayedChildPaths = (state: State, path: Path): Path[] =>
  isContextViewActive(state, path)
    ? getContextViewEntries(state, path).map(entry => entry.path)
    : getChildrenSorted(state, head(simplifyPath(state, path))).map(child => appendToPath(path, child.id))

export default displayedChildPaths
