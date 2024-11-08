import Path from '../@types/Path'
import head from './head'

/** Returns true if the heads of two Paths are the same. Returns true if both Paths are null, and false if only one is null. */
const equalPathHead = (path1: Path | null, path2: Path | null) =>
  path1 === path2 || (path1 && path2 && head(path1) === head(path2))

export default equalPathHead
