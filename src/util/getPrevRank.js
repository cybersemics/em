import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Gets a rank that comes before all items in a context. */
export const getPrevRank = (itemsRanked, thoughtIndex, contextIndex) => {
  const children = getChildrenWithRank(itemsRanked, thoughtIndex, contextIndex)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}
