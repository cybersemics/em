import axios from 'axios'

const endpoint = 'https://us-central1-em-search-test.cloudfunctions.net/getSearchKey'

/** Get search api key for the user. */
const getSearchApiKey = async (userId: string) => axios.post(endpoint, {
  userId
}).then(res => res.data.apiKey)

export default getSearchApiKey
