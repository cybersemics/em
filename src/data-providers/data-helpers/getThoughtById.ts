import { ThoughtId } from '../../@types'
import { DataProvider } from '../DataProvider'

/**
 * Get Thought for the given thought id.
 */
const getThoughtById = (db: DataProvider, thoughtId: ThoughtId) => {
  return db.getContextById(thoughtId)
}

export default getThoughtById
