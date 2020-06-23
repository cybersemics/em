import { ROOT_TOKEN } from '../constants'
import { contextOf } from '../util'
import { Context, Path } from '../types'

type ReturnType = {
  (param: Context): Context,
  (param: Path): Path,
}

/** Get the contextOf of thoughts or [ROOT_TOKEN] if there are none. */
// @ts-ignore
export const rootedContextOf: ReturnType =
  (thoughts: Context | Path) => thoughts.length > 1
    ? contextOf(thoughts)
    : [ROOT_TOKEN]
