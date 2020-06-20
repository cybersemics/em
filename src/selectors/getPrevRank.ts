import { getThoughtsRanked } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Gets a rank that comes before all thoughts in a context. */
// TODO: Take context not path
export default (state: State, context: Context) => {
  const children = getThoughtsRanked(state, context)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}
