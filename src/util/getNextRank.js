import { getThoughtsRanked } from './getThoughtsRanked.js'

/** Gets the next rank at the end of a list. */
export const getNextRank = (context, thoughtIndex, contextIndex) => {
  const children = getThoughtsRanked(context, thoughtIndex, contextIndex)
  return children.length > 0
    ? children[children.length - 1].rank + 1
    : 0
}
