import Index from '../@types/IndexType'
import Path from '../@types/Path'
import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import head from '../util/head'
import keyValueBy from '../util/keyValueBy'

/** Generates a map of all visible paths, including the cursor, all its ancestors, and the expanded paths. Keyed by ThoughtId. */
const expandedWithAncestors = (state: State, expanded: Index<Path>): Index<Path> => {
  const { cursor } = state
  const path = cursor || [HOME_TOKEN]

  return {
    ...expanded,
    // generate the cursor and all its ancestors
    // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
    ...keyValueBy(path, (value, i) => {
      const pathAncestor = path.slice(0, path.length - i) as Path
      return pathAncestor.length > 0 ? { [head(pathAncestor)]: pathAncestor } : null
    }),
  }
}

export default expandedWithAncestors
