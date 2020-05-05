// util
import {
  contextOf,
  equalThoughtValue,
  getThoughtsRanked,
  head,
} from '../util'

/** Returns path to the archive of the given context. */
export const pathToArchive = (path, context) => {
  const rankedArchive = getThoughtsRanked(context)
    .find(equalThoughtValue('=archive'))
  return [...contextOf(path), rankedArchive, head(path)]
}
