import Path from '../@types/Path'
import State from '../@types/State'
import splitChain from './splitChain'

/** Gets the entrance of the nearest context view traversed by a displayed path. */
const nearestPortalPath = (state: State, path: Path | null): Path | null => {
  if (!path) return null
  const chain = splitChain(state, path)
  return chain.length > 1 ? (chain.slice(0, -1).flat() as Path) : null
}

export default nearestPortalPath
