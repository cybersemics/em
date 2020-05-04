
import {
  equalThoughtValue,
  getThoughtsRanked,
} from '../util'
import { splice } from './splice'

// Return path to archive in the same context
export const pathToArchive = (path, context) => {
  const rankedArchive = getThoughtsRanked(context)
    .find(equalThoughtValue('=archive'))
  const archive = [rankedArchive]
  return splice(path, path.length - 1, 0, ...archive)
}
