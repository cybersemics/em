// selectors
import getThoughtsRanked from '../selectors/getThoughtsRanked'

/** Gets a rank that comes before all thoughts in a context. */
// TODO: Take context not path
export const getPrevRank = (context, thoughtIndex, contextIndex) => {
  const children = getThoughtsRanked({ contextIndex, thoughtIndex }, context)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}
