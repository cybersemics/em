import _ from 'lodash'
import { getSortPreference, hasChild, isContextViewActive } from '../selectors'
import {
  compareByRank,
  compareThought,
  compareThoughtDescending,
  hashContext,
  isAbsolute,
  isFunction,
  sort,
  pathToContext,
  equalThoughtRanked,
  head,
  unroot,
  headValue,
  isDescendant,
  splice,
  createId,
} from '../util'
import { Child, ComparatorFunction, Context, ContextHash, ThoughtContext, Parent, Path, State } from '../@types'

// use global instance of empty array so object reference doesn't change
const noChildren: Child[] = []

/** A selector that retrieves thoughts from a context and performs other functions like sorting or filtering. */
type GetThoughts = (state: State, context: Context) => Child[]

/** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
export const isChildVisible = _.curry(
  (state: State, context: Context, child: Child) =>
    !isFunction(child.value) && !hasChild(state, unroot([...context, child.value]), '=hidden'),
)

/** Gets a Parent from the contextIndex. */
export const getParent = ({ thoughts: { contextIndex } }: State, context: Context): Parent | null =>
  contextIndex[hashContext(context)]

/** Returns the thoughts for the context that has already been encoded (such as Firebase keys). */
export const getAllChildrenByContextHash = (
  { thoughts: { contextIndex } }: State,
  contextEncoded: ContextHash,
): Child[] => contextIndex[contextEncoded]?.children || noChildren

/** Returns the subthoughts of the given context unordered. If the subthoughts have not changed, returns the same object reference. */
export const getAllChildren = (state: State, context: Context) =>
  getAllChildrenByContextHash(state, hashContext(context))

/** Makes a getAllChildren function that only returns visible thoughts. */
const getVisibleThoughts = _.curry((getThoughtsFunction: GetThoughts, state: State, context: Context) => {
  const children = getThoughtsFunction(state, context)
  return state.showHiddenThoughts ? children : children.filter(isChildVisible(state, context))
})

/** Makes a getAllChildren function that only returns visible thoughts with cursor check. */
const getVisibleThoughtsWithCursorCheck = _.curry(
  (getThoughtsFunction: GetThoughts, state: State, path: Path, context: Context) => {
    const children = getThoughtsFunction(state, context)
    return state.showHiddenThoughts
      ? children
      : children.filter(isChildVisibleWithCursorCheck(state, path, context, false))
  },
)

/** Returns true if the context has any visible children. */
export const hasChildren = (state: State, context: Context) => {
  const children = getAllChildren(state, context)
  return state.showHiddenThoughts ? children.length > 0 : children.some(isChildVisible(state, context))
}

/** Gets all visible children within a context. */
export const getChildren = getVisibleThoughts(getAllChildren)

/** Gets all children within a context sorted by rank or sort preference. */
export const getAllChildrenSorted = (state: State, context: Context) => {
  const getThoughtsFunction =
    getSortPreference(state, context).type === 'Alphabetical' ? getChildrenSortedAlphabetical : getChildrenRanked
  return getThoughtsFunction(state, context)
}

/** Gets all visible children within a context sorted by rank or sort preference.
 * Note: It doesn't check if thought lies within the cursor path or is descendant of meta cursor.
 */
export const getChildrenSorted = getVisibleThoughts(getAllChildrenSorted)

/** Gets all visible children within a context sorted by rank or sort preference.
 * Note: It checks if thought lies within the cursor path or is descendant of meta cursor.
 */
export const getChildrenSortedWithCursorCheck = getVisibleThoughtsWithCursorCheck(getAllChildrenSorted)

/** Gets a list of all children of a context sorted by the given comparator function. */
const getChildrenSortedBy = (state: State, context: Context, compare: ComparatorFunction<Child>) =>
  sort(getAllChildren(state, context), compare)

/** Returns the absolute difference between to child ranks. */
const rankDiff = (a: Child, b: Child) => Math.abs(a?.rank - b?.rank)

/** Generates children sorted by their values. Sorts empty thoughts to their point of creation. */
const getChildrenSortedAlphabetical = (state: State, context: Context): Child[] => {
  const comparatorFunction =
    getSortPreference(state, context).direction === 'Desc' ? compareThoughtDescending : compareThought
  const sorted = getChildrenSortedBy(state, context, comparatorFunction)
  const emptyIndex = sorted.findIndex(child => !child.value)
  return emptyIndex === -1 ? sorted : resortEmptyInPlace(sorted)
}

/** Re-sorts empty thoughts in a sorted array to their point of creation. */
const resortEmptyInPlace = (sorted: Child[]): Child[] => {
  if (sorted.length === 1) return sorted

  let emptyIndex = sorted.findIndex(child => !child.value)

  // for each empty thought, find the nearest thought according to rank, determine if it was created before or after, and then splice the empty thought back into the sorted array where it was created
  let sortedFinal = sorted
  const numEmpties = sorted.filter(child => !child.value).length
  let i = 0

  // eslint-disable-next-line fp/no-loops
  while (emptyIndex !== -1 && i++ < numEmpties) {
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

/** Gets all children of a context sorted by their ranking. Returns a new object reference even if the children have not changed. */
export const getChildrenRanked = (state: State, context: Context): Child[] =>
  getChildrenSortedBy(state, context, compareByRank)

/** Returns the first visible child of a context. */
export const firstVisibleChild = (state: State, context: Context) => getChildrenSorted(state, context)[0]

/** Returns the first visible child (with cursor check) of a context. */
export const firstVisibleChildWithCursorCheck = (state: State, path: Path, context: Context) =>
  getChildrenSortedWithCursorCheck(state, path, context)[0]

/** Checks if a child lies within the cursor path. */
const isChildInCursor = (state: State, path: Path, showContexts: boolean, child: Child | ThoughtContext) => {
  const childPath = unroot([
    ...path,
    showContexts
      ? {
          id: createId(),
          value: pathHeadValue(state, path, child, showContexts),
          rank: (child as ThoughtContext).rank,
          lastUpdated: (child as ThoughtContext).lastUpdated,
          archived: (child as ThoughtContext).archived,
        }
      : (child as Child),
  ])
  return state.cursor && equalThoughtRanked(state.cursor[childPath.length - 1], head(childPath))
}

/** Returns head of context if parent has active context view. */
const pathHeadValue = (state: State, path: Path, child: Child | ThoughtContext, showContexts: boolean) => {
  return showContexts ? head((child as ThoughtContext).context) : (child as Child).value
}

/** Check if the cursor is a meta attribute && the given context is the descendant of the cursor.  */
const isDescendantOfMetaCursor = (state: State, context: Context): boolean => {
  if (!state.cursor) return false

  return isFunction(headValue(state.cursor)) && isDescendant(pathToContext(state.cursor), context)
}

/** Checks if the child is visible or if the child lies within the cursor or is descendant of the meta cursor. */
const isChildVisibleWithCursorCheck = _.curry(
  (state: State, path: Path, context: Context, showContexts = false, child: Child | ThoughtContext) => {
    showContexts = showContexts || isContextViewActive(state, pathToContext(path))

    const value = pathHeadValue(state, path, child, showContexts)
    const childContext = [...pathToContext(path), value]

    return (
      state.showHiddenThoughts ||
      isChildVisible(state, context, { id: createId(), value, rank: child.rank }) ||
      isChildInCursor(state, path, showContexts, child) ||
      isDescendantOfMetaCursor(state, childContext)
    )
  },
  5,
)

/** Checks if the child is created after latest absolute context toggle. */
const isCreatedAfterAbsoluteToggle = _.curry(
  (state: State, child: Child | ThoughtContext) =>
    child.lastUpdated && state.absoluteContextTime && child.lastUpdated > state.absoluteContextTime,
)

/**
 * Children filter predicate used for rendering.
 *
 * 1. Checks if the child is visible.
 * 2. Checks if child is within cursor.
 * 3. Checks if child is created after latest absolute context toggle if starting context is absolute.
 */
export const childrenFilterPredicate = _.curry(
  (state: State, path: Path, context: Context, showContexts = false, child: Child | ThoughtContext) => {
    return (
      isChildVisibleWithCursorCheck(state, path, context, showContexts, child) &&
      (!isAbsolute(state.rootContext) || isCreatedAfterAbsoluteToggle(state, child))
    )
  },
  5,
)
