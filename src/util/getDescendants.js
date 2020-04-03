import { store } from '../store'

// util
import {
  flatMap,
  head,
} from '../util'

// selectors
import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Generates a flat list of all descendants */
export const getDescendants = (thoughtsRanked, recur/* INTERNAL */) => {
  const children = getThoughtsRanked(store.getState(), thoughtsRanked)
  // only append current thought in recursive calls
  return (recur ? [head(thoughtsRanked)] : []).concat(
    flatMap(children, child => getDescendants(thoughtsRanked.concat(child), true))
  )
}
