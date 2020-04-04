import { flatMap } from './flatMap'
import { head } from './head'
import { getThoughtsRanked } from './getThoughtsRanked'

/** Generates a flat list of all descendants */
export const getDescendants = (thoughtsRanked, recur/* INTERNAL */) => {
  const children = getThoughtsRanked(thoughtsRanked)
  // only append current thought in recursive calls
  return (recur ? [head(thoughtsRanked)] : []).concat(
    flatMap(children, child => getDescendants(thoughtsRanked.concat(child), true))
  )
}
