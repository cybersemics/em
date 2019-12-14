import {
  ROOT_TOKEN,
} from '../constants.js'

// util
/** Returns true if the items or itemsRanked is the root item. */
// declare using traditional function syntax so it is hoisted
export const isRoot = items =>
  items.length === 1 && items[0] && (items[0].key === ROOT_TOKEN || items[0] === ROOT_TOKEN || (items[0].context && isRoot(items[0].context)))
