import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import { intersections } from './intersections.js'

/** Get the intersections of an items or [ROOT_TOKEN] if there are none */
export const rootedIntersections = items => items.length > 1 ? intersections(items) : [ROOT_TOKEN]
