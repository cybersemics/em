import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import { contextOf } from './contextOf.js'

/** Get the contextOf an thoughts or [ROOT_TOKEN] if there are none */
export const rootedContextOf = thoughts => thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]
