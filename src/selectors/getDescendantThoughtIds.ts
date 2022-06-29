import _ from 'lodash'
import compareByRank from '../util/compareByRank'
import sort from '../util/sort'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import { getAllChildrenAsThoughts } from './getChildren'
import getThoughtById from './getThoughtById'

interface Options {
  filterFunction?: (thought: Thought) => boolean
  // orders each level by rank in the return list
  ordered?: boolean
}

// use an internal flag to differentiate recursive calls
interface OptionsInternal extends Options {
  recur?: boolean
}

/** Generates a flat list of all descendant Paths (not including starting thought). If a filterFunction is provided, descendants of thoughts that are filtered out are not traversed. */
const getDescendantThoughtIds = (state: State, thoughtId: ThoughtId, options: Options = {}): ThoughtId[] => {
  const { filterFunction, ordered, recur } = options as OptionsInternal
  const thought = getThoughtById(state, thoughtId)

  if (!thought) return []

  const childrenRaw = getAllChildrenAsThoughts(state, thoughtId)

  const children = ordered ? sort(childrenRaw, compareByRank) : childrenRaw

  if (!children) return []

  const filteredChildren = filterFunction ? children.filter(thought => filterFunction(thought)) : children
  // only append current thought in recursive calls
  return (recur ? [thoughtId] : []).concat(
    _.flatMap(filteredChildren, child =>
      getDescendantThoughtIds(state, child.id, {
        filterFunction,
        recur: true,
        ordered,
      } as Options),
    ),
  )
}

export default getDescendantThoughtIds
