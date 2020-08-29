import _ from 'lodash'
import { head, unroot } from '../util'
import { getThoughtsRanked } from '../selectors'
import { State } from '../util/initialState'
import { Child, Path } from '../types'

/** Generates a flat list of all descendants. */
const getDescendants = (state: State, thoughtsRanked: Path, recur?: boolean/* INTERNAL */): Child[] => {
  const children = getThoughtsRanked(state, thoughtsRanked)
  // only append current thought in recursive calls
  return (recur ? [head(thoughtsRanked)] : []).concat(
    _.flatMap(children, child => getDescendants(state, unroot(thoughtsRanked.concat(child)), true))
  )
}

export default getDescendants
