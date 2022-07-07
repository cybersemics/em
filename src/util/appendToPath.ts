import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import isRoot from '../util/isRoot'

/** Appends one or more Child nodes to a Path or SimplePath. Ensures ROOT is removed. */
const appendToPath = <T extends Path | SimplePath>(path: T | null, ...children: ThoughtId[]): T =>
  // unknown needed because variadic positioning does not satisfy minimum length requirement of Path
  // also needed for Branding to SimplePath
  !path || isRoot(path) ? (children as T) : ([...path, ...children] as unknown as T)

export default appendToPath
