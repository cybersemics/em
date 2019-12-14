import { equalItemRanked } from './equalItemRanked.js'

/** Returns a subset of items from the start to the given item (inclusive) */
export const ancestors = (itemsRanked, itemRanked) => itemsRanked.slice(0, itemsRanked.findIndex(cur => equalItemRanked(cur, itemRanked)) + 1)
