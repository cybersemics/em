import _ from 'lodash'
import { Child, Context } from '../types'
import { State } from '../util/initialState'
import { getSortPreference, getThought, getThoughts, getThoughtsSorted, hasChild } from '../selectors'
import { compareByRank, head, isFunction, sort, unroot } from '../util'

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

/** Makes a getThoughts function that only returns visible thoughts. */
const getVisibleThoughts = _.curry((getThoughtsFunction: GetThoughts, state: State, context: Context) => {
  const children = getThoughtsFunction(state, context)
  return state.showHiddenThoughts
    ? children
    : children.filter(isChildVisible(state, context))
})

/** Returns true if the context has any visible children. */
export const hasChildren = (state: State, context: Context) => {
  const children = getThoughts(state, context)
  return state.showHiddenThoughts
    ? children.length > 0
    : children.some(isChildVisible(state, context))
}

/** Gets all visible children within a context. */
export const getChildren = getVisibleThoughts(getThoughts)

/** Gets all visible children within a context sorted by rank or sort preference. */
export const getChildrenSorted = (state: State, context: Context) => {
  const sortPreference = getSortPreference(state, context)
  const getThoughtsFunction = sortPreference === 'Alphabetical' ? getThoughtsSorted : getChildrenRanked
  return getVisibleThoughts(getThoughtsFunction, state, context)
}

/** Generates children of a context sorted by their ranking. Returns a new object reference even if the children have not changed. */
export const getChildrenRanked = (state: State, context: Context): Child[] => {
  return sort(
    getThoughts(state, context)
      .filter(child => getThought(state, child.value)),
    compareByRank
  )
}

/** Returns the first visible child of a context. */
export const firstVisibleChild = (state: State, context: Context) =>
  getChildrenSorted(state, context)[0]
