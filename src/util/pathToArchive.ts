import { parentOf, equalThoughtValue, head, pathToContext } from '../util'
import { getPrevRank, getChildrenRanked } from '../selectors'
import { State } from './initialState'
import { Context, Path } from '../types'

/** Returns path to the archive of the given context. */
export const pathToArchive = (state: State, path: Path, context: Context): Path | null => {
  const rankedArchive = getChildrenRanked(state, context)
    .find(equalThoughtValue('=archive'))
  if (!rankedArchive) return null
  const archivePath = rankedArchive
    ? [...parentOf(path), rankedArchive]
    : parentOf(path)
  const newRank = getPrevRank(state, pathToContext(archivePath))
  return [...parentOf(path), rankedArchive, { ...head(path), rank: newRank }]
}
