import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import { contextOf } from './contextOf.js'

/** Get the contextOf an items or [ROOT_TOKEN] if there are none */
export const rootedIntersections = items => items.length > 1 ? contextOf(items) : [ROOT_TOKEN]
