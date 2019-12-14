import { flatMap } from './flatMap.js'
import { head } from './head.js'
import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Generates a flat list of all descendants */
export const getDescendants = (thoughtsRanked, recur/* INTERNAL */) => {
  const children = getChildrenWithRank(thoughtsRanked)
  // only append current thought in recursive calls
  return (recur ? [head(thoughtsRanked)] : []).concat(
    flatMap(children, child => getDescendants(thoughtsRanked.concat(child), true))
  )
}
