import { getChildrenRanked } from '../selectors'
import { State } from '../util/initialState'
import { Child, Context } from '../types'

/** Gets a nested subtree of all of the given context's descendants. */
const subtree = (state: State, context: Context): Child[] =>
  getChildrenRanked(state, context).map(child => ({
    ...child,
    subthoughts: subtree(state, context.concat(child.value))
  }))

export default subtree
