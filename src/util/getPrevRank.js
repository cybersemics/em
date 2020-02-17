import { getThoughtsRanked } from './getThoughtsRanked.js'

/** Gets a rank that comes before all thoughts in a context. */
// TODO: Take context not path
export const getPrevRank = (context, thoughtIndex, contextIndex) => {
  const children = getThoughtsRanked(context, thoughtIndex, contextIndex)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}
