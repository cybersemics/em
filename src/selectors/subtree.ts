import { getChildrenRanked } from '../selectors'
import { Child, Context, State } from '../types'

/** Gets a nested subtree of all of the given context's descendants. */
const subtree = (state: State, context: Context): Child[] =>
  getChildrenRanked(state, context).map(child => ({
    ...child,
    subthoughts: subtree(state, context.concat(child.value)),
  }))

export default subtree
