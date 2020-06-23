import { ROOT_TOKEN } from '../constants'
import { contextOf } from '../util'
import { Context, Path } from '../types'

/** Get the contextOf of thoughts or [ROOT_TOKEN] if there are none. */
// @ts-ignore
export const rootedContextOf = <T extends Context | Path>(thoughts: T): T =>
  thoughts.length > 1
    ? contextOf(thoughts) as T
    : [ROOT_TOKEN] as T
