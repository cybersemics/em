import AlgoliaClient from 'algoliasearch'
import { Store } from 'redux'
import { ALGOLIA_CONFIG } from '../constants'
import { setRemoteSearch } from '../action-creators'
import getSearchApiKey from '../search/getSearchApiKey'

/**
 * Initialize algolia search client.
 */
export const initAlgoliaSearch = async (userId: string, store: Store) => {
  const apiKey = await getSearchApiKey(userId)
  window.algoliaClient = AlgoliaClient(ALGOLIA_CONFIG.applicationId, apiKey)
  store.dispatch(setRemoteSearch(true))
}
