import Context from '../@types/Context'
import State from '../@types/State'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Gets all children of a Context. */
const getAllChildrenAsThoughtsByContext = (state: State, context: Context) =>
  getAllChildrenAsThoughts(state, contextToThoughtId(state, context))

export default getAllChildrenAsThoughtsByContext
