import { store } from '../store'
import _ from 'lodash'

// util
import {
  head,
} from '../util'

// selectors
import {
  getDescendants,
  getThoughtsRanked,
} from '../selectors'

/** Generates a flat list of all descendants. */
export default (state, thoughtsRanked, recur/* INTERNAL */) => {
  const children = getThoughtsRanked(store.getState(), thoughtsRanked)
  // only append current thought in recursive calls
  return (recur ? [head(thoughtsRanked)] : []).concat(
    _.flatMap(children, child => getDescendants(state, thoughtsRanked.concat(child), true))
  )
}
