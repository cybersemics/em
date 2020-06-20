import { getThoughtsRanked } from '../selectors'
import { State } from '../util/initialState'
import { Context } from '../types'

/** Gets the next rank at the end of a list. */
export default (state: State, context: Context) => {
  const children = getThoughtsRanked(state, context)
  return children.length > 0
    ? children[children.length - 1].rank + 1
    : 0
}
