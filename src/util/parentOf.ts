import Context from '../@types/Context'
import Path from '../@types/Path'

/** Gets the parent of a Context or Path. Assumes path.length > 1. If the path could be in a root context, use rootedParentOf instead. */
const parentOf = <T extends Context | Path>(contextOrPath: T): T => contextOrPath.slice(0, -1) as T

export default parentOf
