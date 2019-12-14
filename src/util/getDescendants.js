import { flatMap } from './flatMap.js'
import { signifier } from './signifier.js'
import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Generates a flat list of all descendants */
export const getDescendants = (itemsRanked, recur/* INTERNAL */) => {
  const children = getChildrenWithRank(itemsRanked)
  // only append current item in recursive calls
  return (recur ? [signifier(itemsRanked)] : []).concat(
    flatMap(children, child => getDescendants(itemsRanked.concat(child), true))
  )
}
