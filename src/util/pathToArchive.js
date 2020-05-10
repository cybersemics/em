// util
import {
  contextOf,
  equalThoughtValue,
  getThoughtsRanked,
  head,
} from '../util'
import { getPrevRank } from './getPrevRank'
import { pathToContext } from './pathToContext'

/** Returns path to the archive of the given context. */
export const pathToArchive = (path, context) => {
  const rankedArchive = getThoughtsRanked(context)
    .find(equalThoughtValue('=archive'))
  const archivePath = [...contextOf(path), rankedArchive]
  const newRank = getPrevRank(pathToContext(archivePath))
  const originalRank = head(path).rank
  return [...contextOf(path), rankedArchive, { ...head(path), rank: newRank, originalRank }]
}
