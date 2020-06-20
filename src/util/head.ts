import { Child, Context, Path } from '../types'

type ReturnType = {
  (param: Context): string,
  (param: Path): Child,
  (param: Context | Path): string | Child,
}

/** Gets the signifying label of the given context. */
export const head: ReturnType = (thoughts: any) => thoughts[thoughts.length - 1]
