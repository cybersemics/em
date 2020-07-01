import { contextOf, equalThoughtValue, head, pathToContext } from '../util'
import { getPrevRank, getThoughtsRanked } from '../selectors'
import { State } from './initialState'
import { Context, Path } from '../types'

/** Returns path to the archive of the given context. */
export const pathToArchive = (state: State, path: Path, context: Context) => {
  const rankedArchive = getThoughtsRanked(state, context)
    .find(equalThoughtValue('=archive'))
  const archivePath = rankedArchive
    ? [...contextOf(path), rankedArchive]
    : contextOf(path)
  const newRank = getPrevRank(state, pathToContext(archivePath))
  return [...contextOf(path), rankedArchive, { ...head(path), rank: newRank }]
}
