import { DataProvider } from '../data-providers/DataProvider'
import { Context, Index, Lexeme } from '../types'
import { hashContext } from '../util'
import { search } from './algolia'

/**
 * Search Service that uses algoliaClient for searching thoughtIndex.
 */
const SearchService = () => {

  /** Get results by value. */
  const searchByValue = (value: string) => search(value)

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
