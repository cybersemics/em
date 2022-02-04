import { getChildrenRanked } from '../selectors'
import { Context, State, ThoughtId } from '../@types'
import { getChildrenRankedById } from './getChildren'

/** Gets the next rank at the end of a list. */
const getNextRank = (state: State, context: Context) => {
  const children = getChildrenRanked(state, context)
  return children.length > 0 ? children[children.length - 1].rank + 1 : 0
}

// @MIGRATION_TODO: Change this as the default
/** Gets the next rank at the end of a list. */
export const getNextRankById = (state: State, id: ThoughtId) => {
  const children = getChildrenRankedById(state, id)
  return children.length > 0 ? children[children.length - 1].rank + 1 : 0
}
export default getNextRank
