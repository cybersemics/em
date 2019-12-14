import { getChildrenWithRank } from './getChildrenWithRank.js'
import { rootedContextOf } from './rootedContextOf.js'
import { sigKey } from './sigKey.js'
import { sigRank } from './sigRank.js'

/** Gets a new rank before the given item in a list but after the previous item. */
export const getRankBefore = itemsRanked => {

  const value = sigKey(itemsRanked)
  const rank = sigRank(itemsRanked)
  const context = rootedContextOf(itemsRanked)
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

  const i = children.findIndex(child => child.key === value && child.rank === rank)

  // cannot find items with given rank
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
