import Path from '../@types/Path'
import headId from './headId'

/**
 * Returns true if two Paths end at the same thought. Returns true if both Paths are null, and false if only one is
 * null.
 *
 * Compares the thoughts the Paths resolve to rather than their raw steps, so that a context-view Path and the
 * SimplePath of the Lexeme instance it stands for are recognized as the same thought — e.g. a/m~/b and b/m.
 */
const equalPathHead = (path1: Path | null, path2: Path | null) =>
  path1 === path2 || (path1 && path2 && headId(path1) === headId(path2))

export default equalPathHead
