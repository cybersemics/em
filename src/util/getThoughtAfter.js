import { getThoughtsRanked } from './getThoughtsRanked'
import { rootedContextOf } from './rootedContextOf.js'
import { headValue } from './headValue.js'
import { headRank } from './headRank.js'

/** Gets a new rank after the given thought in a list but before the following thought. */
export const getThoughtAfter = thoughtsRanked => {

  const value = headValue(thoughtsRanked)
  const rank = headRank(thoughtsRanked)
  const context = rootedContextOf(thoughtsRanked)
  const children = getThoughtsRanked(context)

  if (children.length === 0) {
    return null
  }
  // if there is no value, it means nothing is selected
  // get rank after the last child
  else if (value === undefined) {
    // guard against NaN/undefined
    return children[children.length - 1].value
  }

  let i = children.findIndex(child => child.value === value && child.rank === rank) // eslint-disable-line fp/no-let

  // quick hack for context view when rank has been supplied as 0
  if (i === -1) {
    i = children.findIndex(child => child.value === value)
  }

  // cannot find thoughts with given rank
  if (i === -1) {
    return null
  }

  return children[i + 1]
}
