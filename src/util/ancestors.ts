import { ThoughtId, Path } from '../@types'

/** Returns a subpath of ancestor children up to the given thought (inclusive). */
export const ancestors = (path: Path, child: ThoughtId): Path | null => {
  const subPath = path.slice(0, path.findIndex(currentChild => currentChild === child) + 1) as Path
  return subPath.length > 0 ? subPath : null
}
