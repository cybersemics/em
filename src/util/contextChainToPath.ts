import { Child } from '../types'

/** Join the segments of a context chain, eliminating the overlap, and return the resulting thoughtsRanked. */
// how is this different than chain()? Hmmmm... good question...
export const contextChainToPath = (contextChain: Child[][]): (Child)[] =>
  [contextChain[0]].concat(contextChain.slice(1).map(thoughtsRanked => thoughtsRanked.slice(1))).flat()
