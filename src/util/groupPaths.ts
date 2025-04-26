import Index from '../@types/IndexType'
import Path from '../@types/Path'
import keyValueBy from './keyValueBy'

/** Groups a list of paths by ancestors. */
const groupPaths = (paths: Path[]): Index<Index> => {
  const groups: Index<Path[]> = {}
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]
    if (path.length === 0) {
      groups._ = []
      continue
    }
    if (!groups[path[0]]) {
      groups[path[0]] = []
    }
    groups[path[0]].push(path.slice(1) as Path)
  }

  return keyValueBy(groups, (id, rest) => ({ [id]: groupPaths(rest) }))
}

export default groupPaths
