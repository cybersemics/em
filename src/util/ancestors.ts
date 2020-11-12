import { equalThoughtRanked } from './equalThoughtRanked'
import { Child, Path } from '../types'

/** Returns a subpath of ancestor children up to the given thought (inclusive). */
export const ancestors = (path: Path, child: Child): Path | null => {
  const subPath = path.slice(0, path.findIndex(currentChild => equalThoughtRanked(currentChild, child)) + 1)
  return subPath.length > 0 ? subPath : null
}
