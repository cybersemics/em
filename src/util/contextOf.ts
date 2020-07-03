import { Context, Path } from '../types'

/** Gets the context of a context. */
export const contextOf = <T extends Context | Path>(context: T): T =>
  context.slice(0, -1) as T
