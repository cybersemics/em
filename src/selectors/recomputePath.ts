import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_PATH } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import splitChain from '../selectors/splitChain'
import thoughtToPath from '../selectors/thoughtToPath'
import equalPath from '../util/equalPath'
import head from '../util/head'

/** Recomputes a path that may have been invalidated by a move, by resolving its thought to the thought's current location. Returns null if the thought no longer exists. Paths that cross a context view are returned as-is, since they do not follow the parent chain and therefore cannot be reconstructed by thoughtToPath. */
const recomputePath = (state: State, path: Path): Path | null => {
  // e.g. a/m~/a does not follow the parent chain (the trailing a is a context of the Lexeme m, whose real parent is the root), so thoughtToPath would collapse it to a.
  if (splitChain(state, path).length > 1) return getThoughtById(state, head(path)) ? path : null

  const recomputed = thoughtToPath(state, head(path))
  return recomputed && equalPath(recomputed, HOME_PATH) ? null : recomputed
}

export default recomputePath
