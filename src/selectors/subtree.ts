import { Child, Context, State } from '../@types'
import { getChildrenRanked } from '../selectors'

/** Gets a nested subtree of all of the given context's descendants. */
const subtree = (state: State, context: Context): Child[] =>
  getChildrenRanked(state, context).map(child => ({
    ...child,
    subthoughts: subtree(state, context.concat(child.value)),
  }))

export default subtree
