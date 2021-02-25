import { equalThoughtValue, headRank, headValue, pathToContext } from '../util'
import { getChildrenSorted } from '../selectors'
import { State } from '../util/initialState'
import { SimplePath } from '../types'
import rootedParentOf from './rootedParentOf'

/** Gets a new rank after the given thought in a list but before the following thought. */
const getThoughtAfter = (state: State, simplePath: SimplePath) => {

  const value = headValue(simplePath)
  const rank = headRank(simplePath)
  const parentPath = rootedParentOf(state, simplePath)
  const children = getChildrenSorted(state, pathToContext(parentPath))

  if (children.length === 0) {
    return null
  }
  // if there is no value, it means nothing is selected
  // get rank after the last child
  else if (value === undefined) {
    // guard against NaN/undefined
    return children[children.length - 1]
  }

  let i = children.findIndex(child => child.value === value && child.rank === rank) // eslint-disable-line fp/no-let

  // quick hack for context view when rank has been supplied as 0
  if (i === -1) {
    i = children.findIndex(equalThoughtValue(value))
  }

  // cannot find thoughts with given rank
  if (i === -1) {
    return null
  }

  return children[i + 1]
}

export default getThoughtAfter
