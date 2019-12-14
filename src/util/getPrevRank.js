import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Gets a rank that comes before all items in a context. */
export const getPrevRank = (thoughtsRanked, thoughtIndex, contextIndex) => {
  const children = getChildrenWithRank(thoughtsRanked, thoughtIndex, contextIndex)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}
