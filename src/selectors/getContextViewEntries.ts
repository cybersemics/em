import Path from '../@types/Path'
import State from '../@types/State'
import appendToPath from '../util/appendToPath'
import hashPath from '../util/hashPath'
import headValue from '../util/headValue'
import getContextsSortedAndRanked from './getContextsSortedAndRanked'
import getThoughtById from './getThoughtById'
import thoughtToPath from './thoughtToPath'

/** Resolves each context occurrence to its collapsed parent or registered unfolded ancestor. */
const getContextViewEntries = (state: State, path: Path) => {
  const value = headValue(state, path)
  return value === undefined
    ? []
    : getContextsSortedAndRanked(state, value).flatMap(context => {
        const anchor = appendToPath(path, context.id)
        const expansion = state.contextViewExpansions[hashPath(anchor)]
        const thought = getThoughtById(state, expansion?.ancestorId || context.parentId)
        return thought
          ? [
              {
                context,
                thought,
                expansion,
                path: expansion ? appendToPath(anchor, thought.id) : appendToPath(path, thought.id),
                simplePath: thoughtToPath(state, thought.id),
              },
            ]
          : []
      })
}

export default getContextViewEntries
