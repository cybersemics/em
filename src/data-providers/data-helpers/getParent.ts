import { DataProvider } from '../DataProvider'

/**
 * Get parent entry for the given thought id.
 */
const getParent = (db: DataProvider, thoughtId: string) => {
  return db.getContextById(thoughtId)
}

export default getParent
