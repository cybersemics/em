import { Context, Path } from '../@types'

/** Gets the parent of a Context or Path. */
export const parentOf = <T extends Context | Path>(contextOrPath: T): T => contextOrPath.slice(0, -1) as T
