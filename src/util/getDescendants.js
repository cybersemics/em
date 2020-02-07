import { flatMap } from './flatMap.js'
import { head } from './head.js'
import { getThoughtsRanked } from './getThoughtsRanked.js'

/** Generates a flat list of all descendants */
export const getDescendants = (thoughtsRanked, recur/* INTERNAL */) => {
  const children = getThoughtsRanked(thoughtsRanked)
  // only append current thought in recursive calls
  return (recur ? [head(thoughtsRanked)] : []).concat(
    flatMap(children, child => getDescendants(thoughtsRanked.concat(child), true))
  )
}
