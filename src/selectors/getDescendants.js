import { store } from '../store'

// util
import {
  flatMap,
  head,
} from '../util'

// selectors
import { getDescendants } from '../selectors'
import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Generates a flat list of all descendants */
export default (state, thoughtsRanked, recur/* INTERNAL */) => {
  const children = getThoughtsRanked(store.getState(), thoughtsRanked)
  // only append current thought in recursive calls
  return (recur ? [head(thoughtsRanked)] : []).concat(
    flatMap(children, child => getDescendants(state, thoughtsRanked.concat(child), true))
  )
}
