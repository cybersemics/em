import Path from '../@types/Path'
import State from '../@types/State'
import expandThoughts from '../selectors/expandThoughts'
import hashPath from '../util/hashPath'

/** Calculates the expanded context due to hover expansion on empty child drop. */
const expandBottom = (state: State, { path }: { path: Path }): State => ({
  ...state,
  expanded: { ...state.expanded, ...expandThoughts(state, path) },
  expandHoverBottomPaths: { ...state.expandHoverBottomPaths, [hashPath(path)]: path },
})

export default expandBottom
