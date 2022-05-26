import { Context, State } from '../@types'
import { getChildrenRankedById } from '../selectors'
import { contextToThoughtId } from '../util'

/** Gets  children of a Context sorted by rank. */
const getChildrenRankedByContext = (state: State, context: Context) =>
  getChildrenRankedById(state, contextToThoughtId(state, context))

export default getChildrenRankedByContext
