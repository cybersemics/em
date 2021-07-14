import { Context, State } from '../@types'
import { getChildrenRanked } from '../selectors'

/** Gets the next rank at the end of a list. */
const getNextRank = (state: State, context: Context) => {
  const children = getChildrenRanked(state, context)
  return children.length > 0 ? children[children.length - 1].rank + 1 : 0
}

export default getNextRank
