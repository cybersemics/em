import { ThoughtId } from '../../@types'
import { DataProvider } from '../DataProvider'

/**
 * Get parent entry for the given thought id.
 */
const getParent = (db: DataProvider, thoughtId: ThoughtId) => {
  return db.getContextById(thoughtId)
}

export default getParent
