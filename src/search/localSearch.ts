import { Context, Index } from '../@types'
import * as db from '../data-providers/dexie'
import { getContextMap } from '../util'

/**
 * Search by value and return context map.
 */
export const searchAndGenerateContextMap = async (value: string): Promise<Index<Context>> => {
  const lexemes = await db.fullTextSearch(value)
  return getContextMap(lexemes)
}
