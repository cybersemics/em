import { isRoot } from './isRoot'
import { Context, Path } from '../types'

/** Removes ROOT_TOKEN from the beginning of a Context or Path. */
export const unroot = <T extends Context | Path>(thoughts: T): T =>
  thoughts.length > 0 && isRoot(thoughts.slice(0, 1))
    ? thoughts.slice(1) as T
    : thoughts
