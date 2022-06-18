import _ from 'lodash'
import { compareByRank, sort } from '../util'
import { State, Thought, ThoughtId } from '../@types'
import { getAllChildrenAsThoughts } from './getChildren'
import getThoughtById from './getThoughtById'

interface OptionsPath {
  filterFunction?: (thought: Thought) => boolean
  ordered?: boolean
}

// use an internal flag to differentiate recursive calls
interface OptionsPathInternal extends OptionsPath {
  recur?: boolean
}

/** Generates a flat list of all descendant Paths. If a filterFunction is provided, descendants of thoughts that are filtered out are not traversed. */
export const getDescendantThoughtIds = (state: State, thoughtId: ThoughtId, options: OptionsPath = {}): ThoughtId[] => {
  const { filterFunction, ordered, recur } = options as OptionsPathInternal
  const thought = getThoughtById(state, thoughtId)

  if (!thought) return []

  const thoughts = getAllChildrenAsThoughts(state, thoughtId)

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
export const someDescendants = (state: State, id: ThoughtId, predicate: (thought: Thought) => boolean) => {
  let found = false
  // ignore the return value of getDescendants
  // we are just using its filterFunction to check pending
  getDescendantThoughtIds(state, id, {
    filterFunction: thought => {
      if (predicate(thought)) {
        found = true
      }
      // if pending has been found, return false to filter out all remaining children and short circuit
      return !found
    },
  })

  return found
}
