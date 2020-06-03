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
import { InitialStateInterface } from './initialState'
import { Context, Path } from '../types'

/** Returns path to the archive of the given context. */
export const pathToArchive = (state: InitialStateInterface, path: Path, context: Context) => {
  const rankedArchive = getThoughtsRanked(state, context)
    .find(equalThoughtValue('=archive'))
  const archivePath = [...contextOf(path), rankedArchive]
  const newRank = getPrevRank(state, pathToContext(archivePath))
  return [...contextOf(path), rankedArchive, { ...head(path), rank: newRank }]
}
