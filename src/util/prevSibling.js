import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Gets a context's previous sibling with its rank.
  @param context   context or path
*/
export const prevSibling = (value, context, rank) => {
  const siblings = getChildrenWithRank(context)
  let prev// eslint-disable-line fp/no-let
  siblings.find(child => {
    if (child.value === value && child.rank === rank) {
      return true
    }
    else {
      prev = child
      return false
    }
  })
  return prev
}
