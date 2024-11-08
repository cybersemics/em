import Context from '../@types/Context'
import Path from '../@types/Path'

/** Gets the parent of a Context or Path. */
const parentOf = <T extends Context | Path>(contextOrPath: T): T => contextOrPath.slice(0, -1) as T

export default parentOf
