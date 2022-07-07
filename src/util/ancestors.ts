import Path from '../@types/Path'
import ThoughtId from '../@types/ThoughtId'

/** Returns a subpath of ancestor children up to the given thought (inclusive). */
const ancestors = (path: Path, child: ThoughtId): Path | null => {
  const subPath = path.slice(0, path.findIndex(currentChild => currentChild === child) + 1) as Path
  return subPath.length > 0 ? subPath : null
}

export default ancestors
