import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import { getChildrenSorted } from './getChildren'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import getThoughtById from './getThoughtById'
import isContextViewActive from './isContextViewActive'
import rootedParentOf from './rootedParentOf'
import simplifyPath from './simplifyPath'

/** Gets all sibling paths at the given path's visual level, including context-view boundaries. */
const getSiblingPaths = (state: State, path: Path | null = state.cursor): Path[] => {
  const parentPath = path ? rootedParentOf(state, path) : HOME_PATH

  if (path && isContextViewActive(state, parentPath)) {
    const contextViewThought = getThoughtById(state, head(parentPath))

    return contextViewThought
      ? getContextsSortedAndRanked(state, contextViewThought.value).flatMap(context => {
          const contextParent = getThoughtById(state, context.parentId)
          return contextParent ? [appendToPath(parentPath, contextParent.id)] : []
        })
      : []
  }

  const parentId = path ? head(simplifyPath(state, parentPath)) : HOME_TOKEN
  return getChildrenSorted(state, parentId).map(child => appendToPath(parentPath, child.id))
}

export default getSiblingPaths
