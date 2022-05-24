import { head } from '../util'
import { getChildrenSortedById } from '../selectors'
import { SimplePath, State } from '../@types'
import rootedParentOf from './rootedParentOf'
import getThoughtById from './getThoughtById'

/** Gets a new rank before the given thought in a list but after the previous thought. */
const getThoughtBefore = (state: State, simplePath: SimplePath) => {
  const cursorThought = getThoughtById(state, head(simplePath))
  const { value, rank } = cursorThought
  const parentPath = rootedParentOf(state, simplePath)
  const children = getChildrenSortedById(state, head(parentPath))

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
