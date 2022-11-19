import Path from '../@types/Path'
import State from '../@types/State'
import expandThoughts from '../selectors/expandThoughts'
import hashPath from '../util/hashPath'

/** Calculates the expanded context due to hover expansion on empty child drop. */
const expandDown = (state: State, { path }: { path: Path }): State => ({
  ...state,
  expanded: { ...state.expanded, ...expandThoughts(state, path) },
  expandHoverDownPaths: { ...state.expandHoverDownPaths, [hashPath(path)]: path },
})

export default expandDown
