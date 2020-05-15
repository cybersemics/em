// util
import {
  contextOf,
  equalThoughtValue,
  head,
} from '../util'

// selectors
import {
  getThoughtsRanked,
} from '../selectors'

/** Returns path to the archive of the given context. */
export const pathToArchive = (state, path, context) => {
  const rankedArchive = getThoughtsRanked(state, context)
    .find(equalThoughtValue('=archive'))
  return [...contextOf(path), rankedArchive, head(path)]
}
