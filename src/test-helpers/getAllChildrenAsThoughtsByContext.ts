import { Context, State } from '../@types'
import { getAllChildrenAsThoughtsById } from '../selectors/getChildren'
import { contextToThoughtId } from '../util'

/** Gets all children of a Context. */
const getAllChildrenAsThoughtsByContext = (state: State, context: Context) =>
  getAllChildrenAsThoughtsById(state, contextToThoughtId(state, context))

export default getAllChildrenAsThoughtsByContext
