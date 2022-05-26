import _ from 'lodash'
import { compareByRank, contextToThoughtId, sort, unroot } from '../util'
import { getChildrenRanked } from '../selectors'
import { Context, Thought, State, ThoughtId } from '../@types'
import { getAllChildrenAsThoughtsById } from './getChildren'
import childIdsToThoughts from './childIdsToThoughts'
import getThoughtById from './getThoughtById'

interface OptionsPath {
  filterFunction?: (thought: Thought) => boolean
  ordered?: boolean
}

// use an internal flag to differentiate recursive calls
interface OptionsPathInternal extends OptionsPath {
  recur?: boolean
}

interface OptionsContext {
  filterFunction?: (thought: Thought, context: Context) => boolean
  ordered?: boolean
}

// use an internal flag to differentiate recursive calls
interface OptionsContextInternal extends OptionsContext {
  recur?: boolean
}

/** Generates a flat list of all descendant Contexts. If a filterFunction is provided, descendants of thoughts that are filtered out are not traversed. */
export const getDescendantContexts = (state: State, context: Context, options: OptionsContext = {}): Context[] => {
  const { filterFunction, ordered, recur } = options as OptionsContextInternal
  const id = contextToThoughtId(state, context)
  const children = id ? (ordered ? getChildrenRanked : getAllChildrenAsThoughtsById)(state, id) : []
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
export const getDescendantThoughtIds = (state: State, thoughtId: ThoughtId, options: OptionsPath = {}): ThoughtId[] => {
  const { filterFunction, ordered, recur } = options as OptionsPathInternal
  const thought = getThoughtById(state, thoughtId)

  if (!thought) return []

  const thoughts = childIdsToThoughts(state, thought.children)

  const children = ordered ? sort(thoughts, compareByRank) : thoughts

  if (!children) return []

  const filteredChildren = filterFunction ? children.filter(thought => filterFunction(thought)) : children
  // only append current thought in recursive calls
  return (recur ? [thoughtId] : []).concat(
    _.flatMap(filteredChildren, child =>
      getDescendantThoughtIds(state, child.id, {
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
  predicate: (thought: Thought, context: Context) => boolean,
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
