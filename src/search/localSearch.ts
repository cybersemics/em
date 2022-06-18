import Context from '../@types/Context'
import Index from '../@types/IndexType'
import State from '../@types/State'
import getContextMap from '../util/getContextMap'
import * as db from '../data-providers/dexie'

// @MIGRATION_TODO: Change this api to return ids instead of context.
/**
 *
 */
export const getLocalSearch = (state: State) => {
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
