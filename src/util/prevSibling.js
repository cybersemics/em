import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Gets an items's previous sibling with its rank. */
export const prevSibling = (value, contextRanked, rank) => {
  const siblings = getChildrenWithRank(contextRanked)
  let prev// eslint-disable-line fp/no-let
  siblings.find(child => {
    if (child.key === value && child.rank === rank) {
      return true
    }
    else {
      prev = child
      return false
    }
  })
  return prev
}
