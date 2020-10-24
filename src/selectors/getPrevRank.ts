import { getChildrenRanked } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Gets a rank that comes before all thoughts in a context. */
// TODO: Take context not path
const getPrevRank = (state: State, context: Context) => {
  const children = getChildrenRanked(state, context)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}

export default getPrevRank
