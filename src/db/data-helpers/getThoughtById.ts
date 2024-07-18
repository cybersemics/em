import ThoughtId from '../../@types/ThoughtId'
import { DataProvider } from '../DataProvider'

/**
 * Get Thought for the given thought id.
 */
const getThoughtById = (db: DataProvider, thoughtId: ThoughtId) => {
  return db.getThoughtById(thoughtId)
}

export default getThoughtById
