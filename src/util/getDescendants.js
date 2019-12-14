import { flatMap } from './flatMap.js'
import { head } from './head.js'
import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Generates a flat list of all descendants */
export const getDescendants = (itemsRanked, recur/* INTERNAL */) => {
  const children = getChildrenWithRank(itemsRanked)
  // only append current item in recursive calls
  return (recur ? [head(itemsRanked)] : []).concat(
    flatMap(children, child => getDescendants(itemsRanked.concat(child), true))
  )
}
