import _ from 'lodash'
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
import {
  compareThought,
  compareThoughtByCreated,
  compareThoughtByNoteAndRank,
  compareThoughtByNoteDescendingAndRank,
  compareThoughtByUpdated,
  compareThoughtDescending,
} from '../util/compareThought'
import head from '../util/head'
import isAbsolute from '../util/isAbsolute'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import sort from '../util/sort'
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

/** Gets all visible children of an id, unordered. */
export const getChildren = getVisibleThoughtsById(getAllChildrenAsThoughts)

/** Gets a list of all children of a context sorted by the given comparator function. */
const getChildrenSortedBy = (state: State, id: ThoughtId, compare: ComparatorFunction<Thought>): Thought[] =>
  sort(getAllChildrenAsThoughts(state, id), compare)

/** Helper function to create children sorted by direction-aware comparator. */
const getChildrenSortedByDirection = (
  state: State,
  id: ThoughtId,
  ascComparator: ComparatorFunction<Thought>,
  descComparator?: ComparatorFunction<Thought>,
): Thought[] => {
  const sortPreference = getSortPreference(state, id)
  const comparator =
    sortPreference.direction === 'Desc' ? descComparator || ((a, b) => ascComparator(b, a)) : ascComparator
  return getChildrenSortedBy(state, id, comparator)
}

/** Generates children sorted by their values. Sorts empty thoughts to their point of creation. */
const getChildrenSortedAlphabetical = (state: State, id: ThoughtId): Thought[] => {
  const comparatorFunction =
    getSortPreference(state, id).direction === 'Desc' ? compareThoughtDescending : compareThought
  return getChildrenSortedBy(state, id, comparatorFunction)
}

/** Generates children sorted by their creation date. */
const getChildrenSortedCreated = (state: State, id: ThoughtId): Thought[] =>
  getChildrenSortedByDirection(state, id, compareThoughtByCreated)

/** Generates children sorted by their last updated date. */
const getChildrenSortedUpdated = (state: State, id: ThoughtId): Thought[] =>
  getChildrenSortedByDirection(state, id, compareThoughtByUpdated)

/** Generates children sorted by their note value. */
const getChildrenSortedNote = (state: State, id: ThoughtId): Thought[] =>
  getChildrenSortedByDirection(
    state,
    id,
    compareThoughtByNoteAndRank(state),
    compareThoughtByNoteDescendingAndRank(state),
  )

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
/** Returns true if the context has any visible children. */
export const hasChildren = (state: State, id: ThoughtId): boolean =>
  !!findAnyChild(state, id, child => state.showHiddenThoughts || isVisible(state, child))

/** Gets all children of a thought sorted by rank. Returns a new object reference even if the children have not changed. */
export const getChildrenRanked = (state: State, thoughtId: ThoughtId | null): Thought[] => {
  const allChildren = childIdsToThoughts(state, getAllChildren(state, thoughtId))
  return sort(allChildren, compareByRank)
}

/** Returns any child of a thought. Only use on a thought with a single child. Also see: firstVisibleChild. */
export const anyChild = (state: State, id: ThoughtId | undefined | null): Thought | undefined => {
  if (!id) return undefined
  const children = getAllChildren(state, id)
  return children.length > 0 ? getThoughtById(state, children[0]) : undefined
}

/** Returns all child that match the predicate (unordered). */
export const filterAllChildren = (state: State, id: ThoughtId, predicate: (child: Thought) => boolean): Thought[] => {
  const childIds = getAllChildren(state, id).filter(childId => {
    const child = getThoughtById(state, childId)
    return child && predicate(child)
  })
  return childIdsToThoughts(state, childIds)
}
/** Checks if a child lies within the cursor path. */
const isChildInCursor = (state: State, path: Path, child: Thought): boolean => {
  const childPath = unroot([...path, child.id])
  return !!state.cursor && state.cursor[childPath.length - 1] === child.id
}

/** Check if the cursor is a meta attribute && the given Path is the descendant of the cursor.  */
const isDescendantOfMetaCursor = (state: State, path: Path): boolean => {
  if (!state.cursor) return false
  const thought = getThoughtById(state, head(state.cursor))
  if (!thought) return false

  const { value: cursorValue } = thought

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
  return (
    !!thought && !!thought.lastUpdated && !!state.absoluteContextTime && thought.lastUpdated > state.absoluteContextTime
  )
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
/** Gets all children of a Context sorted by rank or sort preference. */
export const getAllChildrenSorted = (state: State, id: ThoughtId): Thought[] => {
  const sortPreference = getSortPreference(state, id)
  if (sortPreference.type === 'Alphabetical') {
    return getChildrenSortedAlphabetical(state, id)
  } else if (sortPreference.type === 'Created') {
    return getChildrenSortedCreated(state, id)
  } else if (sortPreference.type === 'Updated') {
    return getChildrenSortedUpdated(state, id)
  } else if (sortPreference.type === 'Note') {
    return getChildrenSortedNote(state, id)
  } else {
    return getChildrenRanked(state, id)
  }
}

/** Gets all visible children of a thought sorted by rank or sort preference.
 * Note: It doesn't check if thought lies within the cursor path or is descendant of meta cursor.
 */
export const getChildrenSorted = (state: State, id: ThoughtId | null): Thought[] => {
  return id ? getVisibleThoughtsById(getAllChildrenSorted, state, id) : NO_CHILDREN
}
/** Returns the first visible child of a sorted context. */
export const firstVisibleChild = (state: State, id: ThoughtId): Thought | undefined => getChildrenSorted(state, id)[0]

/** Returns the first visible child (with cursor check) of a context. */
export const firstVisibleChildWithCursorCheck = (state: State, path: SimplePath) => {
  const children = getAllChildrenSorted(state, head(path))
  return (state.showHiddenThoughts ? children : children.filter(isChildVisibleWithCursorCheck(state, path)))[0]
}
export default getChildren
