import _ from 'lodash'
import moize from 'moize'
import ComparatorFunction from '../@types/ComparatorFunction'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtContext from '../@types/ThoughtContext'
import ThoughtId from '../@types/ThoughtId'
import getSortPreference from '../selectors/getSortPreference'
import appendToPath from '../util/appendToPath'
import compareByRank from '../util/compareByRank'
import { compareThought, compareThoughtDescending } from '../util/compareThought'
import head from '../util/head'
import isAbsolute from '../util/isAbsolute'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import sort from '../util/sort'
import splice from '../util/splice'
import unroot from '../util/unroot'
import childIdsToThoughts from './childIdsToThoughts'
import getThoughtById from './getThoughtById'

// use global instance of empty array so object reference doesn't change
const NO_CHILDREN: Thought[] = []
const NO_THOUGHT_IDS: ThoughtId[] = []

/** A selector that retrieves thoughts from a context and performs other functions like sorting or filtering. */
type GetThoughtsSelector = (state: State, id: ThoughtId) => Thought[]

/** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
export const isVisible = _.curry((state: State, child: Thought): boolean => {
  // temporarily disable =hidden for performance
  return !isAttribute(child.value) // && !findDescendant(state, child.id, '=hidden')
})

/** Returns the thoughts for the given thought id. If the children have not changed, returns the same object reference. If given null, returns an empty array. */
export const getAllChildren = (state: State, thoughtId: ThoughtId | null): ThoughtId[] => {
  if (!thoughtId) return NO_THOUGHT_IDS
  const childrenMap = getThoughtById(state, thoughtId)?.childrenMap
  const children = childrenMap ? Object.values(childrenMap) : []
  return children?.length > 0 ? children : NO_THOUGHT_IDS
}

/** Returns the subthoughts (as Thoughts) of the given ThoughtId unordered. May return a partial or empty list if any thoughts are missing. */
export const getAllChildrenAsThoughts = (state: State, id: ThoughtId | null): Thought[] => {
  const children = childIdsToThoughts(state, getAllChildren(state, id))
  return children.length === 0 ? NO_CHILDREN : children
}

/** Makes a function that only returns visible thoughts. */
const getVisibleThoughtsById = _.curry(
  (getThoughtsFunction: GetThoughtsSelector, state: State, id: ThoughtId): Thought[] => {
    const children = getThoughtsFunction(state, id)
    return state.showHiddenThoughts ? children : children.filter(isVisible(state))
  },
)

/** Returns true if the context has any visible children. */
export const hasChildren = (state: State, id: ThoughtId): boolean => !!findAnyChild(state, id, isVisible(state))

/** Gets all visible children of an id, unordered. */
export const getChildren = getVisibleThoughtsById(getAllChildrenAsThoughts)

/** Gets all children of a Context sorted by rank or sort preference. */
export const getAllChildrenSorted = (state: State, id: ThoughtId): Thought[] => {
  const getThoughtsFunction =
    getSortPreference(state, id).type === 'Alphabetical' ? getChildrenSortedAlphabetical : getChildrenRanked
  return getThoughtsFunction(state, id)
}

/** Gets all visible children of a thought sorted by rank or sort preference.
 * Note: It doesn't check if thought lies within the cursor path or is descendant of meta cursor.
 */
export const getChildrenSorted = (state: State, id: ThoughtId | null): Thought[] => {
  return id ? getVisibleThoughtsById(getAllChildrenSorted, state, id) : NO_CHILDREN
}

/** Gets a list of all children of a context sorted by the given comparator function. */
const getChildrenSortedBy = (state: State, id: ThoughtId, compare: ComparatorFunction<Thought>): Thought[] =>
  sort(getAllChildrenAsThoughts(state, id), compare)

/** Returns the absolute difference between to child ranks. */
const rankDiff = (a: Thought, b: Thought) => Math.abs(a?.rank - b?.rank)

/** Generates children sorted by their values. Sorts empty thoughts to their point of creation. */
const getChildrenSortedAlphabetical = moize(
  (state: State, id: ThoughtId): Thought[] => {
    const comparatorFunction =
      getSortPreference(state, id).direction === 'Desc' ? compareThoughtDescending : compareThought
    const sorted = getChildrenSortedBy(state, id, comparatorFunction)
    const emptyIndex = sorted.findIndex(thought => !thought.value)
    return emptyIndex === -1 ? sorted : resortEmptyInPlace(sorted)
  },
  {
    maxSize: 50,
    profileName: 'getChildrenSortedAlphabetical',
  },
)

/** Re-sorts empty thoughts in a sorted array to their point of creation. */
const resortEmptyInPlace = (sorted: Thought[]): Thought[] => {
  if (sorted.length === 1) return sorted

  let emptyIndex = sorted.findIndex(child => !child.value)

  // for each empty thought, find the nearest thought according to rank, determine if it was created before or after, and then splice the empty thought back into the sorted array where it was created
  let sortedFinal = sorted
  const numEmpties = sorted.filter(child => !child.value).length
  let i = 0
  while (emptyIndex !== -1 && i++ < numEmpties) {
    // ignore empty thoughts that have an explicit sortOrder
    // sortOrder is set when editing a thought to the empty thought in order to preserve their sort order
    if (sorted[emptyIndex]?.sortValue) {
      // not sure why the linter fails here since emptyIndex and i are declared outside the loop
      // See: https://eslint.org/docs/rules/no-loop-func
      // eslint-disable-next-line no-loop-func
      emptyIndex = sortedFinal.findIndex((child, i) => i < emptyIndex && !child.value)
      continue
    }

    // add an index to each thought
    const sortedWithIndex = sortedFinal.map((child, i) => ({ ...child, i }))

    // remove the first empty thought
    const sortedNoEmpty = splice(sortedWithIndex, emptyIndex, 1)
    const empty = sortedWithIndex[emptyIndex]

    // find the nearest sibling to the empty thought
    // getRankBefore places the new thought closer its next sibling
    // getRankAfter places the new thought closer its previous sibling
    const nearestSibling = sortedNoEmpty.reduce((accum, child) => {
      const diffEmpty = rankDiff(empty, child)
      const diffMin = rankDiff(empty, accum)
      return diffEmpty < diffMin ? child : accum
    }, sortedNoEmpty[0])

    // determine whether the empty thought was created before or after
    const isEmptyBeforeNearest = empty.rank < nearestSibling.rank

    // calculate the new index and splice the empty thought into place
    const emptyIndexNew = nearestSibling.i + (isEmptyBeforeNearest ? -1 : 0)
    sortedFinal = splice(sortedNoEmpty, emptyIndexNew, 0, empty)

    // get the emptyIndex for the next iteration of the loop, ignoring empty thoughts that have already been spliced
    emptyIndex = sortedFinal.findIndex((child, i) => i < emptyIndexNew && !child.value)
  }

  return sortedFinal
}

/** Gets all children of a thought sorted by rank. Returns a new object reference even if the children have not changed. */
export const getChildrenRanked = moize(
  (state: State, thoughtId: ThoughtId | null): Thought[] => {
    const allChildren = childIdsToThoughts(state, getAllChildren(state, thoughtId))
    return sort(allChildren, compareByRank)
  },
  {
    maxSize: 50,
    profileName: 'getChildrenRanked',
  },
)

/** Returns any child of a thought. Only use on a thought with a single child. Also see: firstVisibleChild. */
export const anyChild = (state: State, id: ThoughtId | undefined | null): Thought | undefined => {
  if (!id) return undefined
  const children = getAllChildren(state, id)
  return children.length > 0 ? getThoughtById(state, children[0]) : undefined
}

/** Finds any child that matches the predicate. If there is more than one child that matches the predicate, which one is returned is non-deterministic. */
export const findAnyChild = (
  state: State,
  id: ThoughtId,
  predicate: (child: Thought) => boolean,
): Thought | undefined => {
  const childId = getAllChildren(state, id).find(childId => {
    const child = getThoughtById(state, childId)
    return child && predicate(child)
  })
  return childId ? getThoughtById(state, childId) : undefined
}

/** Returns all child that match the predicate (unordered). */
export const filterAllChildren = (state: State, id: ThoughtId, predicate: (child: Thought) => boolean): Thought[] => {
  const childIds = getAllChildren(state, id).filter(childId => {
    const child = getThoughtById(state, childId)
    return child && predicate(child)
  })
  return childIdsToThoughts(state, childIds)
}

/** Returns the first visible child of a sorted context. */
export const firstVisibleChild = (state: State, id: ThoughtId): Thought | undefined => getChildrenSorted(state, id)[0]

/** Returns the first visible child (with cursor check) of a context. */
export const firstVisibleChildWithCursorCheck = (state: State, path: SimplePath) => {
  const children = getAllChildrenSorted(state, head(path))
  return (state.showHiddenThoughts ? children : children.filter(isChildVisibleWithCursorCheck(state, path)))[0]
}

/** Checks if a child lies within the cursor path. */
const isChildInCursor = (state: State, path: Path, child: Thought): boolean => {
  const childPath = unroot([...path, child.id])
  return !!state.cursor && state.cursor[childPath.length - 1] === child.id
}

/** Check if the cursor is a meta attribute && the given Path is the descendant of the cursor.  */
const isDescendantOfMetaCursor = (state: State, path: Path): boolean => {
  if (!state.cursor) return false

  const { value: cursorValue } = getThoughtById(state, head(state.cursor))

  return isAttribute(cursorValue) && isDescendantPath(path, state.cursor)
}

/** Checks if the child is visible or if the child lies within the cursor or is descendant of the meta cursor. */
const isChildVisibleWithCursorCheck = _.curry(
  (state: State, path: SimplePath, thought: Thought): boolean =>
    state.showHiddenThoughts ||
    isVisible(state, thought) ||
    isChildInCursor(state, path, thought) ||
    isDescendantOfMetaCursor(state, appendToPath(path, thought.id)),
  3,
)

/** Checks if the child is created after latest absolute context toggle. */
const isCreatedAfterAbsoluteToggle = _.curry((state: State, child: ThoughtId | ThoughtContext): boolean => {
  const thought = getThoughtById(state, child)
  return !!thought.lastUpdated && !!state.absoluteContextTime && thought.lastUpdated > state.absoluteContextTime
})

/**
 * Children filter predicate used for rendering.
 *
 * 1. Checks if the child is visible.
 * 2. Checks if child is within cursor.
 * 3. Checks if child is created after latest absolute context toggle if starting context is absolute.
 */
export const childrenFilterPredicate = _.curry((state: State, parentPath: SimplePath, child: Thought): boolean => {
  return (
    isChildVisibleWithCursorCheck(state, parentPath, child) &&
    (!isAbsolute(state.rootContext) || isCreatedAfterAbsoluteToggle(state, child.id))
  )
}, 3)

export default getChildren
