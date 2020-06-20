import { getThoughtsRanked } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Gets a nested subtree of all of the given context's descendants. */
const subtree = (state: State, context: Context): any =>
  getThoughtsRanked(state, context).map(child => ({
    ...child,
    subthoughts: subtree(state, context.concat(child.value))
  }))

export default subtree
