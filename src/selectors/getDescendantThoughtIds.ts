import _ from 'lodash'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import compareByRank from '../util/compareByRank'
import sort from '../util/sort'
import { getAllChildrenAsThoughts } from './getChildren'
import getThoughtById from './getThoughtById'

interface Options {
  /** Filters out thoughts and does not traverse their descendants. */
  filterFunction?: (thought: Thought) => boolean
  /** Filters out thoughts that fail the predicate, but continues to traverse their descendants. */
  filterAndTraverse?: (thought: Thought) => boolean
  // orders each level by rank in the return list
  ordered?: boolean
}

// use an internal flag to differentiate recursive calls
interface OptionsInternal extends Options {
  exclude?: boolean
  recur?: boolean
}

/** Generates a flat list of all descendant Paths (not including starting thought). If a filterFunction is provided, descendants of thoughts that are filtered out are not traversed. */
const getDescendantThoughtIds = (state: State, thoughtId: ThoughtId, options: Options = {}): ThoughtId[] => {
  const { exclude, filterFunction, filterAndTraverse, ordered, recur } = options as OptionsInternal
  const thought = getThoughtById(state, thoughtId)

  if (!thought) return []

  const childrenRaw = getAllChildrenAsThoughts(state, thoughtId)

  const children = ordered ? sort(childrenRaw, compareByRank) : childrenRaw

  if (!children) return []

  const filteredChildren = filterFunction ? children.filter(filterFunction) : children
  const descendants = _.flatMap(filteredChildren, child =>
    getDescendantThoughtIds(state, child.id, {
      filterAndTraverse,
      filterFunction,
      exclude: filterAndTraverse && !filterAndTraverse(child),
      recur: true,
      ordered,
    } as Options),
  )

  // only append current thought in recursive calls
  return [...(recur && !exclude ? [thoughtId] : []), ...descendants]
}

export default getDescendantThoughtIds
