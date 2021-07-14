import _ from 'lodash'
import { Child, Context, SimplePath, State } from '../@types'
import { getChildrenRanked } from '../selectors'
import { head, pathToContext, unroot } from '../util'

interface Options {
  recur?: boolean
  filterFunction?: (child: Child, context: Context, simplePath: SimplePath) => boolean
}

/** Generates a flat list of all descendants. */
const getDescendants = (state: State, simplePath: SimplePath, { recur, filterFunction }: Options = {}): Child[] => {
  const context = pathToContext(simplePath)
  const children = getChildrenRanked(state, context)
  const filteredChildren = filterFunction
    ? children.filter(child => filterFunction(child, context, simplePath))
    : children
  // only append current thought in recursive calls
  return (recur ? [head(simplePath)] : []).concat(
    _.flatMap(filteredChildren, child =>
      getDescendants(state, unroot([...simplePath, child] as SimplePath), {
        recur: true,
        filterFunction,
      }),
    ),
  )
}

export default getDescendants
