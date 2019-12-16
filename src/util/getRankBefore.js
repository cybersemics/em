import { getChildrenWithRank } from './getChildrenWithRank.js'
import { rootedContextOf } from './rootedContextOf.js'
import { headValue } from './headValue.js'
import { headRank } from './headRank.js'

/** Gets a new rank before the given thought in a list but after the previous thought. */
export const getRankBefore = thoughtsRanked => {

  const value = headValue(thoughtsRanked)
  const rank = headRank(thoughtsRanked)
  const context = rootedContextOf(thoughtsRanked)
  const children = getChildrenWithRank(context)

  // if there are no children, start with rank 0
  if (children.length === 0) {
    return 0
  }
  // if there is no value, it means nothing is selected
  // get rank before the first child
  else if (value === undefined) {
    return children[0].rank - 1
  }

  const i = children.findIndex(child => child.value === value && child.rank === rank)

  // cannot find thoughts with given rank
  if (i === -1) {
    return 0
  }

  const prevChild = children[i - 1]
  const nextChild = children[i]

  const newRank = prevChild
    ? (prevChild.rank + nextChild.rank) / 2
    : nextChild.rank - 1

  return newRank
}
