import { Path, SimplePath } from '../types'

/** Join the segments of a context chain, eliminating the overlap, and return the resulting path. */
// how is this different than chain()? Hmmmm... good question...
export const contextChainToPath = (contextChain: SimplePath[]): Path => {
  const truncatedSimplePaths = contextChain.slice(1).map(path => path.slice(1)) as SimplePath[]
  return [contextChain[0]].concat(truncatedSimplePaths).flat()
}
