import axios from 'axios'
import { ALGOLIA_CONFIG } from '../constants'

/** Get search api key for the user. */
export const getAlgoliaApiKey = async (userId: string) => axios.post(ALGOLIA_CONFIG.searchKeyEndpoint, {
  userId
}).then(res => res.data.apiKey)
