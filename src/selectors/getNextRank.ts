import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { getChildrenRanked } from './getChildren'

/** Gets the next rank at the end of a list. */
const getNextRank = (state: State, id: ThoughtId) => {
  const children = id ? getChildrenRanked(state, id) : []
  return children.length > 0 ? children[children.length - 1].rank + 1 : 0
}

export default getNextRank
