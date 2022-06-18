import _ from 'lodash'
import compareByRank from '../util/compareByRank'
import sort from '../util/sort'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
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
const getDescendantThoughtIds = (state: State, thoughtId: ThoughtId, options: OptionsPath = {}): ThoughtId[] => {
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

export default getDescendantThoughtIds
