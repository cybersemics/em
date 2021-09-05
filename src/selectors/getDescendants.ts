import _ from 'lodash'
import { appendToPath, pathToContext, unroot } from '../util'
import { getChildrenRanked } from '../selectors'
import { Context, Parent, SimplePath, State } from '../@types'
import { getAllChildrenAsThoughts } from './getChildren'

interface OptionsPath {
  filterFunction?: (thought: Parent, simplePath: SimplePath) => boolean
  ordered?: boolean
}

// use an internal flag to differentiate recursive calls
interface OptionsPathInternal extends OptionsPath {
  recur?: boolean
}

interface OptionsContext {
  filterFunction?: (thought: Parent, context: Context) => boolean
  ordered?: boolean
}

// use an internal flag to differentiate recursive calls
interface OptionsContextInternal extends OptionsContext {
  recur?: boolean
}

/** Generates a flat list of all descendant Contexts. If a filterFunction is provided, descendants of thoughts that are filtered out are not traversed. */
export const getDescendantContexts = (state: State, context: Context, options: OptionsContext = {}): Context[] => {
  const { filterFunction, ordered, recur } = options as OptionsContextInternal
  const children = (ordered ? getChildrenRanked : getAllChildrenAsThoughts)(state, context)
  const filteredChildren = filterFunction ? children.filter(thought => filterFunction(thought, context)) : children
  // only append current thought in recursive calls
  return (recur ? [context] : []).concat(
    _.flatMap(filteredChildren, child =>
      getDescendantContexts(state, unroot([...context, child.value]), {
        filterFunction,
        recur: true,
        ordered,
      } as OptionsContext),
    ),
  )
}

/** Generates a flat list of all descendant Paths. If a filterFunction is provided, descendants of thoughts that are filtered out are not traversed. */
export const getDescendantPaths = (state: State, simplePath: SimplePath, options: OptionsPath = {}): SimplePath[] => {
  const { filterFunction, ordered, recur } = options as OptionsPathInternal
  const context = pathToContext(state, simplePath)
  const children = (ordered ? getChildrenRanked : getAllChildrenAsThoughts)(state, context)
  const filteredChildren = filterFunction ? children.filter(thought => filterFunction(thought, simplePath)) : children
  // only append current thought in recursive calls
  return (recur ? [simplePath] : []).concat(
    _.flatMap(filteredChildren, child =>
      getDescendantPaths(state, appendToPath(simplePath, child.id), {
        filterFunction,
        recur: true,
        ordered,
      } as OptionsPath),
    ),
  )
}

/** Returns true if any descendants of the given Context fulfills the predicate. Short circuits once found. */
export const someDescendants = (
  state: State,
  context: Context,
  predicate: (thought: Parent, context: Context) => boolean,
) => {
  let found = false
  // ignore the return value of getDescendants
  // we are just using its filterFunction to check pending
  getDescendantContexts(state, context, {
    filterFunction: (thought, context) => {
      if (predicate(thought, context)) {
        found = true
      }
      // if pending has been found, return false to filter out all remaining children and short circuit
      return !found
    },
  })

  return found
}
