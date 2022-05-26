import { Context, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import { contextToThoughtId } from '../selectors'

/** Gets all children of a Context. */
const getAllChildrenAsThoughtsByContext = (state: State, context: Context) =>
  getAllChildrenAsThoughts(state, contextToThoughtId(state, context))

export default getAllChildrenAsThoughtsByContext
