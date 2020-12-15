import { Thunk } from '../types'
import getSearchApiKey from '../search/getSearchApiKey'
import { searchApiKey } from '../action-creators'

/**
 * Fetch api key from server and set it to the state.
 */
const fetchSearchApiKey = (userId: string): Thunk => async dispatch => {
  try {
    const apiKey = await getSearchApiKey(userId)
    dispatch(searchApiKey({ value: apiKey }))
  }
  catch (err) {
  }
}

export default fetchSearchApiKey
