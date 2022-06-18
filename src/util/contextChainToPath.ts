import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'

/** Join the segments of a context chain, eliminating the overlap, and return the resulting path. */
// how is this different than chain()? Hmmmm... good question...
const contextChainToPath = (contextChain: SimplePath[]): Path => {
  const truncatedSimplePaths = contextChain.slice(1).map(path => path.slice(1)) as SimplePath[]
  return [contextChain[0]].concat(truncatedSimplePaths).flat() as Path
}

export default contextChainToPath
