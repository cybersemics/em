import _ from 'lodash'
import { Child, Context } from '../types'
import { State } from '../util/initialState'
import { getThoughts, getThoughtsRanked, hasChild } from '../selectors'
import { isFunction, unroot } from '../util'

/** A selector that retrieves thoughts from a context and performs other functions like sorting or filtering. */
type GetThoughts = (state: State, context: Context) => Child[]

/** Returns true if the child is not hidden due to being a function or having the =hidden attribute. */
const isVisible = _.curry((state: State, context: Context, child: Child) =>
  !isFunction(child.value) && !hasChild(state, unroot([...context, child.value]), '=hidden'))

/** Makes a getThoughts function that only returns visible thoughts. */
const makeGetVisibleThoughts = (getThoughtsFunction: GetThoughts) => (state: State, context: Context) => {
  const children = getThoughtsFunction(state, context)
  return state.showHiddenThoughts ? children : children.filter(isVisible(state, context))
}

/** Gets all visible children within a context. */
export const getChildren = makeGetVisibleThoughts(getThoughts)

/** Gets all visible children within a context sorted by rank. */
export const getChildrenSorted = makeGetVisibleThoughts(getThoughtsRanked)
