import { ALGOLIA_CONFIG } from '../constants'
import { DataProvider } from '../data-providers/DataProvider'
import { Context, Index, Lexeme } from '../types'
import { hashContext } from '../util'

/**
 * Search Service that initializes algoliasearch and returns handlers for seraching thoughtIndex.
 */
const SearchService = () => {
  const client = window.algoliaClient

  if (!client) throw new Error('SearchService wasinstantiated before algolia client was registered.')

  const index = client.initIndex(ALGOLIA_CONFIG.index)

  /** Get results by value. */
  const searchByValue = async (value: string) => {
    const searchResult = await index.search(value)
    return (searchResult.hits as any) as Record<'thoughtHash' | 'value', string>[]
  }

  /**
   * Search by value and generate context map from lexemes.
   */
  const searchAndGenerateContextMap = async (value: string, dataProvider: DataProvider) => {
    const hits = await searchByValue(value)
    const lexemes = await dataProvider.getThoughtsByIds(hits.map(hit => hit.thoughtHash))

    // creating index of context from the lexemes
    const contextMap = (lexemes.filter(lexeme => lexeme) as Lexeme[])
      .reduce<Index<Context>>((acc, lexeme) => {
        return {
          ...acc,
          ...lexeme.contexts.reduce<Index<Context>>((accInner, { context }) => ({
            ...accInner,
            [hashContext(context)]: context
          }), {})
        }
      }, {})

    return contextMap
  }

  return {
    searchByValue,
    searchAndGenerateContextMap
  }
}

export default SearchService
