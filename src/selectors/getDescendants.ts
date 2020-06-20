import { store } from '../store'
import _ from 'lodash'
import { head } from '../util'
import { getThoughtsRanked } from '../selectors'
import { State } from '../util/initialState'
import { Child, Path } from '../types'

/** Generates a flat list of all descendants. */
const getDescendants = (state: State, thoughtsRanked: Path, recur?: boolean/* INTERNAL */): Child[] => {
  const children = getThoughtsRanked(store.getState(), thoughtsRanked)
  // only append current thought in recursive calls
  return (recur ? [head(thoughtsRanked)] : []).concat(
    _.flatMap(children, child => getDescendants(state, thoughtsRanked.concat(child), true))
  )
}

export default getDescendants
