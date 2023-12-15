import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import { getChildrenRanked } from '../selectors/getChildren'
import equalThoughtValue from '../util/equalThoughtValue'
import head from '../util/head'
import getThoughtById from './getThoughtById'
import rootedParentOf from './rootedParentOf'

/** Gets a new rank after the given thought in a list but before the following thought. */
const getRankAfter = (state: State, simplePath: SimplePath) => {
  const thoughtId = head(simplePath)
  const thought = getThoughtById(state, thoughtId)
  const { value, rank } = thought
  const parentPath = rootedParentOf(state, simplePath)
  const children = getChildrenRanked(state, head(parentPath))

  // if there are no children, start with rank 0
  if (children.length === 0) {
    return 0
  }
  // if there is no value, it means nothing is selected
  // get rank after the last child
  else if (value === undefined || value === HOME_TOKEN) {
    // guard against NaN/undefined
    return (children[children.length - 1].rank || 0) + 1
  }

  let i = children.findIndex(child => child.value === value && child.rank === rank)

  // quick hack for context view when rank has been supplied as 0
  if (i === -1) {
    i = children.findIndex(equalThoughtValue(value))
  }

  // cannot find thoughts with given rank
  if (i === -1) {
    return 0
  }

  const prevSubthought = children[i]
  const nextSubthought = children[i + 1]

  const newRank = nextSubthought
    ? // provide a safeguard if the rank doesn't change
      // this *should* never happen, but it will occur if prev and next thought end up with the same rank due to a data integrity isuse
      prevSubthought.rank === nextSubthought.rank
      ? (console.warn('Duplicate ranks detected', prevSubthought, nextSubthought), prevSubthought.rank - Math.random()) // nudge into non-conflicting rank
      : // default case set the rank halfway between the prev and next thoughts
        // set slightly closer to prev thought to allow sorting empty thoughts at the point of creation in alphabetically sorted contexts
        // use a fraction of prevSubthought.rank in order to maintain a nearby order of magnitude without forcing the halving function to jump an order of magnitude
        (prevSubthought.rank + nextSubthought.rank) / 2 - prevSubthought.rank * 10e-8
    : // if there is no next thought (i.e. the thought is the last child) then simply increment the rank
      prevSubthought.rank + 1

  // guard against NaN/undefined
  return newRank || 0
}

export default getRankAfter
