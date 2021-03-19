import AlgoliaClient, { SearchIndex } from 'algoliasearch'
import { Store } from 'redux'
import { ALGOLIA_CONFIG } from '../constants'
import { setRemoteSearch } from '../action-creators'
import { Context, Index } from '../types'
import { getContextMap, getAlgoliaApiKey } from '../util'
import { DataProvider } from '../data-providers/DataProvider'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let searchIndex: SearchIndex

/**
 * Get remote search function.
 */
export const getRemoteSearch = (remoteDataProvider: DataProvider) => {
  /**
   * Search by value and return context map.
   */
  const searchAndGenerateContextMap = async (value: string): Promise<Index<Context>> => {
    if (!searchIndex) throw new Error('Algolia search index has not be initiated.')
    const result = await searchIndex.search(value)
    const hits = (result.hits as any) as Record<'thoughtHash' | 'value', string>[]
    const lexemes = await remoteDataProvider.getThoughtsByIds(hits.map(hit => hit.thoughtHash))
    return getContextMap(lexemes)
  }

  return {
    searchAndGenerateContextMap
  }
}

/**
 * Initialize algolia search client.
 */
const initAlgoliaSearch = async (userId: string, store: Store) => {
  const apiKey = await getAlgoliaApiKey(userId)
  const algoliaClient = AlgoliaClient(ALGOLIA_CONFIG.applicationId, apiKey)
  searchIndex = algoliaClient.initIndex(ALGOLIA_CONFIG.index)
  store.dispatch(setRemoteSearch({ value: true }))
}

export default initAlgoliaSearch
