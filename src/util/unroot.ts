import { isRoot } from './isRoot'
import { Context, Path } from '../types'

/** Removes ROOT_TOKEN from the beginning of a path or context. */
export const unroot = (thoughts: Path | Context) =>
  thoughts.length > 0 && isRoot(thoughts.slice(0, 1))
    ? thoughts.slice(1)
    : thoughts
