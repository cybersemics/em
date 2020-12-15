import algoliasearch from 'algoliasearch'

const APPLICATION_ID = 'XB6QO0072H'
const INDEX = 'EM_THOUGHTS_INDEX'

/**
 * Search Service that initializes algoliasearch and returns handlers for seraching thoughtIndex.
 */
const SearchService = (apiKey: string) => {
  const client = algoliasearch(APPLICATION_ID, apiKey)
  const index = client.initIndex(INDEX)

  /** Get results by value. */
  const searchByValue = async (value: string) => {
    return index.search(value)
  }

  return {
    searchByValue
  }
}

export default SearchService
