// selectors
import {
  getThoughtsRanked,
} from '../selectors'

/** Gets a rank that comes before all thoughts in a context. */
// TODO: Take context not path
export default (state, context) => {
  const children = getThoughtsRanked(state, context)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}
