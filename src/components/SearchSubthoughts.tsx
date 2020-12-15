import React, { FC, useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { State } from '../util/initialState'
import { Connected, Index, Lexeme } from '../types'
import SearchService from '../search/searchService'

interface SearchSubthoughtsProps {
  search?: string | null,
  archived?: boolean,
  searchLimit?: number,
  searchApiKey?: string | null,
  thoughtIndex: Index<Lexeme>,
}

/** Number of thoughts to limit the search results to by default. */
// const DEFAULT_SEARCH_LIMIT = 20

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ archived, search, searchLimit, searchApiKey, thoughts: { thoughtIndex } }: State) => ({
  archived,
  search,
  searchApiKey,
  searchLimit,
  thoughtIndex,
})

/** Subthoughts of search. */
const SearchSubthoughts: FC<Connected<SearchSubthoughtsProps>> = ({ search, searchApiKey }) => {

  const searchService = SearchService(searchApiKey ?? '')

  const [isSearching, setIsSearching] = useState(false)
  const [searchData, setSearchData] = useState<Index<any>[]>([])

  /** Handles search. */
  const handleSearch = async (value: string) => {
    setIsSearching(true)
    const result = await searchService.searchByValue(value)
    setSearchData(result.hits)
    setIsSearching(false)
  }

  useEffect(() => {
    if (search) handleSearch(search)
  }, [search])

  if (!search) return null

  return <div>
    { isSearching && <div> Searching ...</div> }
    {!isSearching && searchData && searchData.map((data, index) => {
      return <div key={index} style={{ margin: '10px 0' }}> ➤{ data.value } - { data.thoughtHash} </div>
    })}
  </div>
}

export default connect(mapStateToProps)(SearchSubthoughts)
