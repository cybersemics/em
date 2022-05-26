import { Context, State } from '../@types'
import { contextToThoughtId, getAllChildren } from '../selectors'

/** Gets all children of a Context. */
const getAllChildrenByContext = (state: State, context: Context) =>
  getAllChildren(state, contextToThoughtId(state, context))

export default getAllChildrenByContext
