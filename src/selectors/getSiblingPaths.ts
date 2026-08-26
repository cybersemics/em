import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_PATH, HOME_TOKEN } from '../constants'
import appendToPath, { appendContextStep } from '../util/appendToPath'
import head from '../util/head'
import headId from '../util/headId'
import { isContextStep } from '../util/pathStep'
import contextThoughtId from './contextThoughtId'
import { getChildrenSorted } from './getChildren'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import getThoughtById from './getThoughtById'
import rootedParentOf from './rootedParentOf'

/** Gets all sibling paths at the given path's visual level, including context-view boundaries. */
const getSiblingPaths = (state: State, path: Path | null = state.cursor): Path[] => {
  const parentPath = path ? rootedParentOf(state, path) : HOME_PATH

  if (path && isContextStep(head(path))) {
    const contextViewThought = getThoughtById(state, contextThoughtId(state, parentPath))

    // each sibling is a context, so its step records the Lexeme instance rather than the context
    return contextViewThought
      ? getContextsSortedAndRanked(state, contextViewThought.value).map(context =>
          appendContextStep(parentPath, context.id),
        )
      : []
  }

  const parentId = path ? headId(parentPath) : HOME_TOKEN
  return getChildrenSorted(state, parentId).map(child => appendToPath(parentPath, child.id))
}

export default getSiblingPaths
