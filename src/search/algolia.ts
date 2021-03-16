import AlgoliaClient, { SearchIndex } from 'algoliasearch'
import { Store } from 'redux'
import { ALGOLIA_CONFIG } from '../constants'
import { setRemoteSearch } from '../action-creators'
import getSearchApiKey from '../util/getAlgoliaApiKey'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let searchIndex: SearchIndex

/**
 * Search by value.
 */
export const search = async (value: string): Promise<Record<'thoughtHash' | 'value', string>[]> => {
  if (!searchIndex) throw new Error('Algolia search index has not be initiated.')
  const result = await searchIndex.search(value)
  return result.hits as any
}

/**
 * Initialize algolia search client.
 */
const initAlgoliaSearch = async (userId: string, store: Store) => {
  const apiKey = await getSearchApiKey(userId)
  const algoliaClient = AlgoliaClient(ALGOLIA_CONFIG.applicationId, apiKey)
  searchIndex = algoliaClient.initIndex(ALGOLIA_CONFIG.index)
  store.dispatch(setRemoteSearch(true))
}

export default initAlgoliaSearch
