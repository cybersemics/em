import { getChildrenRanked } from '../selectors'
import { headRank, headValue, pathToContext } from '../util'
import { State } from '../util/initialState'
import { SimplePath } from '../types'
import rootedParentOf from './rootedParentOf'

/** Gets a new rank before the given thought in a list but after the previous thought. */
const getRankBefore = (state: State, simplePath: SimplePath) => {

  const value = headValue(simplePath)
  const rank = headRank(simplePath)
  const parentPath = rootedParentOf(state, simplePath)
  const children = getChildrenRanked(state, pathToContext(parentPath))

  // if there are no children, start with rank 0
  if (children.length === 0) {
    return 0
  }
  // if there is no value, it means nothing is selected
  // get rank before the first child
  else if (value === undefined) {
    // guard against NaN/undefined
    return (children[0].rank || 0) - 1
  }

  const i = children.findIndex(child => child.value === value && child.rank === rank)

  // cannot find thoughts with given rank
  if (i === -1) {
    return 0
  }

  const prevSubthought = children[i - 1]
  const nextSubthought = children[i]

  const newRank = prevSubthought
    // provide a safeguard if the rank doesn't change
    // this *should* never happen, but it will occur if prev and next thought end up with the same rank due to a data integrity isuse
    ? prevSubthought.rank === nextSubthought.rank
      ? (console.warn('Duplicate ranks detected', prevSubthought, nextSubthought), prevSubthought.rank - Math.random()) // nudge into non-conflicting rank
      // default case set the rank halfway between the prev and next thoughts
      : (prevSubthought.rank + nextSubthought.rank) / 2
    // if there is no previous thought (i.e. the thought is the first child) then simply decrement the rank
    : nextSubthought.rank - 1

  // guard against NaN/undefined
  return newRank || 0
}

export default getRankBefore
