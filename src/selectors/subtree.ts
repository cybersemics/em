import { getChildrenRanked } from '../selectors'
import { Context, Parent, State } from '../@types'

/** Gets a nested subtree of all of the given context's descendants. */
const subtree = (state: State, context: Context): Parent[] =>
  getChildrenRanked(state, context).map(child => ({
    ...child,
    subthoughts: subtree(state, context.concat(child.value)),
  }))

export default subtree
