import Context from '../@types/Context'
import State from '../@types/State'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getAllChildren } from '../selectors/getChildren'

/** Gets all children of a Context. */
const getAllChildrenByContext = (state: State, context: Context) =>
  getAllChildren(state, contextToThoughtId(state, context))

export default getAllChildrenByContext
