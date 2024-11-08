import Context from '../@types/Context'
import Path from '../@types/Path'
import isRoot from './isRoot'

/** Removes the root token from the beginning of a Context or Path. */
const unroot = <T extends Context | Path>(thoughts: T): T =>
  thoughts.length > 0 && isRoot(thoughts.slice(0, 1)) ? (thoughts.slice(1) as T) : thoughts

export default unroot
