import { HOME_TOKEN } from '../constants'
import { keyValueBy, head } from '../util'
import { Index, State, Path } from '../@types'

/** Generates a map of all visible paths, including the cursor, all its ancestors, and the expanded contexts. Keyed by ThoughtId. */
const getVisiblePaths = (state: State, expandedPaths: Index<Path>): Index<Path> => {
  const { cursor } = state
  const path = cursor || [HOME_TOKEN]

  return {
    ...expandedPaths,
    // generate the cursor and all its ancestors
    // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
    ...keyValueBy(path, (value, i) => {
      const pathAncestor = path.slice(0, path.length - i) as Path
      return pathAncestor.length > 0 ? { [head(pathAncestor)]: pathAncestor } : null
    }),
  }
}

export default getVisiblePaths
