import { flatten } from './flatten.js'

/** join the segments of a context chain, eliminating the overlap, and return the resulting itemsRanked */
// how is this different than chain()? Hmmmm... good question...
export const contextChainToItemsRanked = contextChain =>
  flatten([contextChain[0]].concat(contextChain.slice(1).map(itemsRanked => itemsRanked.slice(1))))
