import Context from '../@types/Context'
import State from '../@types/State'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import contextToThoughtId from '../selectors/contextToThoughtId'

/** Gets all children of a Context. */
const getAllChildrenAsThoughtsByContext = (state: State, context: Context) =>
  getAllChildrenAsThoughts(state, contextToThoughtId(state, context))

export default getAllChildrenAsThoughtsByContext
