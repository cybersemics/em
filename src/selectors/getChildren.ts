import _ from 'lodash'
import ComparatorFunction from '../@types/ComparatorFunction'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtContext from '../@types/ThoughtContext'
import ThoughtId from '../@types/ThoughtId'
import ThoughtReaderState from '../@types/ThoughtReaderState'
import getSortPreference from '../selectors/getSortPreference'
import appendToPath from '../util/appendToPath'
import {
  compare,
  compareThought,
  compareThoughtByCreated,
  compareThoughtByCreatedDescending,
  compareThoughtByNote,
  compareThoughtByNoteDescending,
  compareThoughtByUpdated,
  compareThoughtByUpdatedDescending,
  compareThoughtDescending,
  makeOrderedComparator,
} from '../util/compareThought'
import head from '../util/head'
import isAbsolute from '../util/isAbsolute'
import isAttribute from '../util/isAttribute'
import isDescendantPath from '../util/isDescendantPath'
import isEmptyOrEmojiOnly from '../util/isEmptyOrEmojiOnly'
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
export const getAllChildren = (state: ThoughtReaderState, thoughtId: ThoughtId | null): readonly ThoughtId[] => {
  if (!thoughtId) return NO_THOUGHT_IDS
  return state.thoughts.getChildren(thoughtId)
}

/** Returns the subthoughts (as Thoughts) in canonical sibling order. */
export const getAllChildrenAsThoughts = (state: ThoughtReaderState, id: ThoughtId | null): Thought[] => {
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

/** Gets all visible children of an id in canonical sibling order. */
export const getChildren = getVisibleThoughtsById(getAllChildrenAsThoughts)

/** Gets a list of all children of a context sorted by the given comparator function. */
const getChildrenSortedBy = (state: State, id: ThoughtId, compare: ComparatorFunction<Thought>): Thought[] =>
  sort(getAllChildrenAsThoughts(state, id), compare)

/** Returns the direction-aware comparator for a context's sort preference, or null for manual order. Equal sort keys fall back to canonical sibling position, as do empty and emoji-only thoughts. Set sortEmpty to apply the sort condition to empty thoughts as well when explicitly sorting the context. */
export const getSortComparator = (
  state: State,
  id: ThoughtId,
  { sortEmpty }: { sortEmpty?: boolean } = {},
): ComparatorFunction<Thought> | null => {
  const sortPreference = getSortPreference(state, id)
  const isDescending = sortPreference.direction === 'Desc'
  const sortConditionComparator = ((): ComparatorFunction<Thought> | null => {
    switch (sortPreference.type) {
      case 'Alphabetical':
        return isDescending ? compareThoughtDescending : compareThought
      case 'Created':
        return isDescending ? compareThoughtByCreatedDescending : compareThoughtByCreated
      case 'Updated':
        return isDescending ? compareThoughtByUpdatedDescending : compareThoughtByUpdated
      case 'Note':
        return isDescending ? compareThoughtByNoteDescending(state) : compareThoughtByNote(state)
      default:
        return null
    }
  })()

  if (!sortConditionComparator) return null

  /** Keeps ties in canonical order even under descending sorting, so navigation agrees with rendering. */
  const comparePosition: ComparatorFunction<Thought> = (a, b) =>
    compare(state.thoughts.getPosition(a.id) ?? 0, state.thoughts.getPosition(b.id) ?? 0)
  const comparator = makeOrderedComparator([sortConditionComparator, comparePosition])

  if (sortEmpty) return comparator

  // Empty and emoji-only thoughts have no meaningful sort key, so newThought and editThought leave them at their point
  // of creation. Compare their canonical positions so that the sort order matches the rendered order (#4950).
  // Otherwise an empty thought created at the end of an alphabetically sorted context is sorted to the beginning, and
  // sibling-relative commands such as space-to-indent look at the wrong neighbor.
  return (a, b) =>
    isEmptyOrEmojiOnly(a.value) || isEmptyOrEmojiOnly(b.value) ? comparePosition(a, b) : comparator(a, b)
}

/** Finds the first child in canonical sibling order that matches the predicate. */
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

/** Gets all children of a thought in canonical sibling order. */
export const getChildrenRanked = getAllChildrenAsThoughts

/** Returns any child of a thought. Only use on a thought with a single child. Also see: firstVisibleChild. */
export const anyChild = (state: State, id: ThoughtId | undefined | null): Thought | undefined => {
  if (!id) return undefined
  const children = getAllChildren(state, id)
  return children.length > 0 ? getThoughtById(state, children[0]) : undefined
}

/** Returns all children that match the predicate in canonical sibling order. */
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
/** Gets all children of a context in canonical order or by sort preference. */
export const getAllChildrenSorted = (state: State, id: ThoughtId, options: { sortEmpty?: boolean } = {}): Thought[] => {
  const comparator = getSortComparator(state, id, options)
  return comparator ? getChildrenSortedBy(state, id, comparator) : getChildrenRanked(state, id)
}

/** Gets all visible children of a thought in canonical order or by sort preference.
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
