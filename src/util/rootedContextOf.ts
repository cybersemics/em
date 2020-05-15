//@ts-nocheck

import {
  ROOT_TOKEN,
} from '../constants'

// util
import { contextOf } from './contextOf'

/** Get the contextOf of thoughts or [ROOT_TOKEN] if there are none. */
export const rootedContextOf = thoughts => thoughts.length > 1 ? contextOf(thoughts) : [ROOT_TOKEN]
