import Path from '../@types/Path'
import State from '../@types/State'
import head from '../util/head'
import getContextViewExpansion from './getContextViewExpansion'
import thoughtToPath from './thoughtToPath'

/** Resolves an in-memory unfolded route for persistence without retaining its portal markers. */
const dehydrateContextPath = (state: State, path: Path | null) => {
  const unfolded = !!getContextViewExpansion(state, path)
  return {
    path: unfolded && path ? thoughtToPath(state, head(path)) : path,
    unfolded,
  }
}

export default dehydrateContextPath
