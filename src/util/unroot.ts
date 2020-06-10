import { isRoot } from './isRoot'
import { Context, Path } from '../types'

type ReturnType = {
  (param: Context): Context,
  (param: Path): Path,
  (param: Context | Path): Context | Path,
}

/** Removes ROOT_TOKEN from the beginning of a path or context. */
export const unroot: ReturnType = (thoughts: any) =>
  thoughts.length > 0 && isRoot(thoughts.slice(0, 1))
    ? thoughts.slice(1)
    : thoughts
