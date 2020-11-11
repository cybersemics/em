import _ from 'lodash'
import { State } from '../util/initialState'
import { appendChildPath, getChildPath, getSortPreference, getThought, hasChild } from '../selectors'
import { compareByRank, compareThought, hashContext, isFunction, sort, unroot, pathToContext, equalThoughtRanked, head } from '../util'
import { Child, ComparatorFunction, Context, ContextHash, ThoughtContext, SimplePath, Path } from '../types'
import isContextViewActive from './isContextViewActive'

/** A selector that retrieves thoughts from a context and performs other functions like sorting or filtering. */
type GetThoughts = (state: State, context: Context) => Child[]

/** Returns true when context is not hidden due to being a function or having a =hidden attribute. */
export const isContextVisible = (state: State, context: Context) =>
  state.showHiddenThoughts || (
    !isFunction(head(context)) &&
    head(context) !== '=hidden'
  )

/** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
export const isChildVisible = _.curry((state: State, context: Context, child: Child) =>
  !isFunction(child.value) &&
  !hasChild(state, unroot([...context, child.value]), '=hidden'))

/** Returns the thoughts for the context that has already been encoded (such as Firebase keys). */
export const getAllChildrenByContextHash = ({ thoughts: { contextIndex } }: State, contextEncoded: ContextHash): Child[] =>
  ((contextIndex || {})[contextEncoded] || {}).children || []

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
export const getChildrenSorted = (state: State, context: Context) => {
  const sortPreference = getSortPreference(state, context)
  const getThoughtsFunction = sortPreference === 'Alphabetical'
    ? getChildrenSortedAlphabetical
    : getChildrenRanked
  return getThoughtsFunction(state, context)
}

/** Gets all visible children within a context sorted by rank or sort preference.
 * Note: It doesn't check if thought lies within the cursor path.
 */
export const getVisibleChildrenSorted = (state: State, context: Context) => {
  return getVisibleThoughts(getChildrenSorted, state, context)
}

/** Gets a list of all children of a context sorted by the given comparator function. */
const getChildrenSortedBy = (state: State, context: Context, compare: ComparatorFunction<Child>) =>
  sort(
    getAllChildren(state, context)
      .filter(child => getThought(state, child.value)),
    compare
  )

/** Generates children seorted by their values. */
const getChildrenSortedAlphabetical = (state: State, context: Context) =>
  getChildrenSortedBy(state, context, compareThought)

/** Generates children of a context sorted by their ranking. Returns a new object reference even if the children have not changed. */
export const getChildrenRanked = (state: State, context: Context): Child[] =>
  getChildrenSortedBy(state, context, compareByRank)

/** Returns the first visible child of a context. */
export const firstVisibleChild = (state: State, context: Context) =>
  getVisibleChildrenSorted(state, context)[0]

/**
 * Returns only visible thoughts from the children array. It checks if a thought lies within the cursor path.
 *
 * @param state - Redux state.
 * @param path - Parent's path.
 * @param simplePath - Parent's simple path.
 * @param children - Children of the given simplePath's context.
 */
export const getVisibleChildrenWithCursorCheck = (state: State, path: Path, simplePath: SimplePath, children: (Child | ThoughtContext)[]) => {

  const showContexts = isContextViewActive(state, pathToContext(path))

  return children.filter(child => {

    const childSimplePath = getChildPath(state, child, simplePath, showContexts)
    const childPath = appendChildPath(state, childSimplePath, path)

    const value = showContexts
      ? head((child as ThoughtContext).context)
      : (child as Child).value

    return state.showHiddenThoughts ||
      isChildVisible(state, pathToContext(simplePath), { value, rank: child.rank }) ||
      // always include thoughts in cursor
      (state.cursor && equalThoughtRanked(state.cursor[childPath.length - 1], head(childPath)))
  })
}
