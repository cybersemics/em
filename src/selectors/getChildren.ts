import _ from 'lodash'
import { State } from '../util/initialState'
import { appendChildPath, getChildPath, getSortPreference, hasChild, isContextViewActive } from '../selectors'
import { compareByRank, compareThought, hashContext, isAbsolute, isFunction, sort, pathToContext, equalThoughtRanked, head, unroot } from '../util'
import { Child, ComparatorFunction, Context, ContextHash, ThoughtContext, SimplePath, Parent, Path } from '../types'
/** A selector that retrieves thoughts from a context and performs other functions like sorting or filtering. */
type GetThoughts = (state: State, context: Context) => Child[]

/** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
export const isChildVisible = _.curry((state: State, context: Context, child: Child) =>
  !isFunction(child.value) &&
  !hasChild(state, unroot([...context, child.value]), '=hidden'))

/** Gets a Parent from the contextIndex. */
export const getParent = ({ thoughts: { contextIndex } }: State, context: Context): Parent | null =>
  contextIndex[hashContext(context)]

/** Returns the thoughts for the context that has already been encoded (such as Firebase keys). */
export const getAllChildrenByContextHash = ({ thoughts: { contextIndex } }: State, contextEncoded: ContextHash): Child[] =>
  contextIndex[contextEncoded]?.children || []

/** Returns the subthoughts of the given context unordered. If the subthoughts have not changed, returns the same object reference. */
export const getAllChildren = (state: State, context: Context) =>
  getAllChildrenByContextHash(state, hashContext(context))

/** Makes a getAllChildren function that only returns visible thoughts. */
const getVisibleThoughts = _.curry((getThoughtsFunction: GetThoughts, state: State, context: Context) => {
  const children = getThoughtsFunction(state, context)
  return state.showHiddenThoughts
    ? children
    : children.filter(isChildVisible(state, context))
})

/** Returns true if the context has any visible children. */
export const hasChildren = (state: State, context: Context) => {
  const children = getAllChildren(state, context)
  return state.showHiddenThoughts
    ? children.length > 0
    : children.some(isChildVisible(state, context))
}

/** Gets all visible children within a context. */
export const getChildren = getVisibleThoughts(getAllChildren)

/** Gets all children within a context sorted by rank or sort preference. */
export const getAllChildrenSorted = (state: State, context: Context) => {
  const sortPreference = getSortPreference(state, context)
  const getThoughtsFunction = sortPreference === 'Alphabetical'
    ? getChildrenSortedAlphabetical
    : getChildrenRanked
  return getThoughtsFunction(state, context)
}

/** Gets all visible children within a context sorted by rank or sort preference.
 * Note: It doesn't check if thought lies within the cursor path.
 */
export const getChildrenSorted = getVisibleThoughts(getAllChildrenSorted)

/** Gets a list of all children of a context sorted by the given comparator function. */
const getChildrenSortedBy = (state: State, context: Context, compare: ComparatorFunction<Child>) =>
  sort(getAllChildren(state, context), compare)

/** Generates children sorted by their values. */
const getChildrenSortedAlphabetical = (state: State, context: Context) =>
  getChildrenSortedBy(state, context, compareThought)

/** Gets all children of a context sorted by their ranking. Returns a new object reference even if the children have not changed. */
export const getChildrenRanked = (state: State, context: Context): Child[] =>
  getChildrenSortedBy(state, context, compareByRank)

/** Returns the first visible child of a context. */
export const firstVisibleChild = (state: State, context: Context) =>
  getChildrenSorted(state, context)[0]

/** Checks if a child lies within the cursor path. */
const isChildInCursor = (state: State, path: Path, simplePath: SimplePath, child: Child | ThoughtContext) => {
  const showContexts = isContextViewActive(state, pathToContext(path))
  const childSimplePath = getChildPath(state, child, simplePath, showContexts)
  const childPath = appendChildPath(state, childSimplePath, path)
  return state.cursor && equalThoughtRanked(state.cursor[childPath.length - 1], head(childPath))
}

/** Returns head of context if parent has active context view. */
const pathHeadValue = (state: State, path: Path, child: Child | ThoughtContext, showContexts: boolean) => {
  return showContexts
    ? head((child as ThoughtContext).context)
    : (child as Child).value
}

/** Checks if the child is visible and also checks if the child lies within the cursor. */
const isChildVisibleWithCursorCheck = _.curry((state: State, path: Path, simplePath: SimplePath, isForcedChildren = false, child: Child | ThoughtContext) => {
  return state.showHiddenThoughts ||
  isChildVisible(state, pathToContext(simplePath), { value: pathHeadValue(state, path, child, isForcedChildren), rank: child.rank }) ||
  isChildInCursor(state, path, simplePath, child)
})

/** Checks if the child is created after latest absolute context toggle. */
const isCreatedAfterAbsoluteToggle = _.curry((state: State, child: Child | ThoughtContext) =>
  child.lastUpdated && state.absoluteContextTime
&& child.lastUpdated > state.absoluteContextTime)

/**
 * Children filter predicate used for rendering.
 *
 * 1. Checks if the child is visible.
 * 2. Checks if child is within cursor.
 * 3. Checks if child is created after latest absolute context toggle if starting context is absolute.
 */
export const childrenFilterPredicate = _.curry((state: State, path: Path, simplePath: SimplePath, isContextViewActive = false, child: Child | ThoughtContext) => {
  return isChildVisibleWithCursorCheck(state, path, simplePath, isContextViewActive, child) &&
  (!isAbsolute(state.rootContext) || isCreatedAfterAbsoluteToggle(state, child))
}, 5)
