import { store } from '../store'

// util
import {
  headRank,
  headValue,
  rootedContextOf,
} from '../util'

// selectors
import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Gets a new rank before the given thought in a list but after the previous thought. */
export const getThoughtBefore = thoughtsRanked => {

  const value = headValue(thoughtsRanked)
  const rank = headRank(thoughtsRanked)
  const context = rootedContextOf(thoughtsRanked)
  const children = getThoughtsRanked(store.getState(), context)

  // if there are no children, start with rank 0
  if (children.length === 0) {
    return null
  }
  // if there is no value, it means nothing is selected
  // get rank before the first child
  else if (value === undefined) {
    // guard against NaN/undefined
    return children[0].value
  }

  const i = children.findIndex(child => child.value === value && child.rank === rank)

  // cannot find thoughts with given rank
  if (i === -1) {
    return null
  }

  return children[i - 1]
}
