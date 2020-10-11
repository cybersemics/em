import { headRank, headValue, pathToContext, rootedContextOf } from '../util'
import { getChildrenSorted } from '../selectors'
import { State } from '../util/initialState'
import { Path } from '../types'

/** Gets a new rank before the given thought in a list but after the previous thought. */
const getThoughtBefore = (state: State, thoughtsRanked: Path) => {

  const value = headValue(thoughtsRanked)
  const rank = headRank(thoughtsRanked)
  const context = pathToContext(rootedContextOf(thoughtsRanked))
  const children = getChildrenSorted(state, context)

  // if there are no children, start with rank 0
  if (children.length === 0) {
    return null
  }
  // if there is no value, it means nothing is selected
  // get rank before the first child
  else if (value === undefined) {
    // guard against NaN/undefined
    return children[0]
  }

  const i = children.findIndex(child => child.value === value && child.rank === rank)

  // cannot find thoughts with given rank
  if (i === -1) {
    return null
  }

  return children[i - 1]
}

export default getThoughtBefore
