import Path from '../@types/Path'
import State from '../@types/State'
import parentOf from '../util/parentOf'
import getContextViewExpansion from './getContextViewExpansion'
import rootedParentOf from './rootedParentOf'

/** Gets the visible parent, skipping an unfolded entry's hidden occurrence anchor. */
const displayedParentOf = (state: State, path: Path): Path => {
  const expansion = getContextViewExpansion(state, path)
  return expansion && path.length === expansion.contextViewPath.length + 2
    ? expansion.contextViewPath
    : path.length > 1
      ? (parentOf(path) as Path)
      : rootedParentOf(state, path)
}

export default displayedParentOf
