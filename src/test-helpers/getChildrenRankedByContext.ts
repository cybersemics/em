import Context from '../@types/Context'
import State from '../@types/State'
import contextToThoughtId from '../selectors/contextToThoughtId'
import { getChildrenRanked } from '../selectors/getChildren'

/** Gets  children of a Context sorted by rank. */
const getChildrenRankedByContext = (state: State, context: Context) =>
  getChildrenRanked(state, contextToThoughtId(state, context))

export default getChildrenRankedByContext
