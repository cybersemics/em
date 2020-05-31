import {
  ROOT_TOKEN,
} from '../constants'

// util
import { contextOf } from './contextOf'
import { Context, Path } from '../types'

/** Get the contextOf of thoughts or [ROOT_TOKEN] if there are none. */
export const rootedContextOf = (thoughts: Context | Path) => thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]
