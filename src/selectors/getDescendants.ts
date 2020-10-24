import _ from 'lodash'
import { head, pathToContext, unroot } from '../util'
import { getChildrenRanked } from '../selectors'
import { State } from '../util/initialState'
import { Child, SimplePath } from '../types'

/** Generates a flat list of all descendants. */
const getDescendants = (state: State, path: SimplePath, recur?: boolean/* INTERNAL */): Child[] => {
  const children = getChildrenRanked(state, pathToContext(path))
  // only append current thought in recursive calls
  return (recur ? [head(path)] : []).concat(
    _.flatMap(children, child => getDescendants(state, unroot(path.concat(child) as SimplePath), true))
  )
}

export default getDescendants
