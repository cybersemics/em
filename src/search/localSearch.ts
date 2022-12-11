import Context from '../@types/Context'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import State from '../@types/State'
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
    const lexemes: Lexeme[] = [] // await db.fullTextSearch(value)
    return getContextMap(state, lexemes)
  }

  return {
    searchAndGenerateContextMap,
  }
}

export default localSearch
