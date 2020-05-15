// util
import {
  contextOf,
  equalThoughtValue,
  head,
  pathToContext,
} from '../util'

// selectors
import {
  getPrevRank,
  getThoughtsRanked,
} from '../selectors'

/** Returns path to the archive of the given context. */
export const pathToArchive = (state, path, context) => {
  const rankedArchive = getThoughtsRanked(state, context)
    .find(equalThoughtValue('=archive'))
  const archivePath = [...contextOf(path), rankedArchive]
  const newRank = getPrevRank(pathToContext(archivePath))
  const originalRank = head(path).rank
  return [...contextOf(path), rankedArchive, { ...head(path), rank: newRank, originalRank }]
}
