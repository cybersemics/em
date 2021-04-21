import * as db from '../data-providers/dexie'
import dbGetThought from '../data-providers/data-helpers/getThought'

/**
 * Get thought from db for given thought value.
 */
const getThoughtFromDB = async (thought: string) => {
  return await dbGetThought(db, thought)
}
export default getThoughtFromDB
