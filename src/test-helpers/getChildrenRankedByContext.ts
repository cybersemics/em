import { Context, State } from '../@types'
import { getChildrenRanked } from '../selectors'
import { contextToThoughtId } from '../util'

/** Gets  children of a Context sorted by rank. */
const getChildrenRankedByContext = (state: State, context: Context) =>
  getChildrenRanked(state, contextToThoughtId(state, context))

export default getChildrenRankedByContext
