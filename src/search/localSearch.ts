import Context from '../@types/Context'
import Index from '../@types/IndexType'
import State from '../@types/State'
import * as db from '../data-providers/dexie'
import getContextMap from '../util/getContextMap'

// @MIGRATION_TODO: Change this api to return ids instead of context.
/**
 * Do a full text search on the local db.
 */
const localSearch = (state: State) => {
  /**
   * Search by value and return context map.
   */
  const searchAndGenerateContextMap = async (value: string): Promise<Index<Context>> => {
    const lexemes = await db.fullTextSearch(value)
    return getContextMap(state, lexemes)
  }

  return {
    searchAndGenerateContextMap,
  }
}

export default localSearch
