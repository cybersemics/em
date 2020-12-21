import React, { FC, useState, useEffect } from 'react'
import { connect } from 'react-redux'
import { State } from '../util/initialState'
import { Connected, Index, Lexeme, Context, SimplePath } from '../types'
import SearchService from '../search/searchService'
import * as firebaseProvider from '../data-providers/firebase'
import { hashContext, rankThoughtsSequential, sort, isArchived, escapeRegExp, isDocumentEditable, formatNumber } from '../util'
import { searchContexts, searchLimit as setSearchLimit } from '../action-creators'
import { ROOT_TOKEN, EM_TOKEN, RANKED_ROOT } from '../constants'
import { exists } from '../selectors'
import { store } from '../store'
import Subthoughts from './Subthoughts'
import NewThought from './NewThought'

interface SearchSubthoughtsProps {
  search?: string | null,
  archived?: boolean,
  searchLimit?: number,
  searchApiKey?: string | null,
  thoughtIndex: Index<Lexeme>,
}

interface A {
  context: Context,
  hash: string,
}

/** Number of thoughts to limit the search results to by default. */
const DEFAULT_SEARCH_LIMIT = 20

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
const SearchSubthoughts: FC<Connected<SearchSubthoughtsProps>> = ({ search, searchLimit, searchApiKey, archived, thoughtIndex, dispatch }) => {

  const searchService = SearchService(searchApiKey ?? '')

  const [isSearching, setIsSearching] = useState(false)

  /** Handles search. */
  const handleSearch = async (value: string) => {
    setIsSearching(true)
    const result = await searchService.searchByValue(value)
    const hits = result.hits as Index<any>[]
    const lexemes = await firebaseProvider.getThoughtsByIds(hits.map(hit => hit.thoughtHash))

    const contextMap = (lexemes.filter(lexeme => lexeme) as Lexeme[])
      .reduce<A[]>((acc, lexeme) => acc.concat(lexeme.contexts
        .map(({ context }) => ({ hash: hashContext(context), context }))), [])
      .reduce<Index<Context>>((acc, { context, hash }) => ({
        ...acc,
        [hash]: context
      }), {})

    dispatch(searchContexts({ value: contextMap }))
    setIsSearching(false)
  }

  useEffect(() => {
    if (search) handleSearch(search)
  }, [search])

  if (!search) return null

  if (isSearching) return <div>...searching</div>

  const searchRegexp = new RegExp(escapeRegExp(search), 'gi')

  /** Compares two values lexicographically, sorting exact matches to the top. */
  const comparator = (a: string, b: string) => {
    const aLower = a.toLowerCase()
    const bLower = b.toLowerCase()
    const searchLower = search.toLowerCase()
    // 1. exact match
    return bLower === searchLower ? 1
      : aLower === searchLower ? -1
      // 2. starts with search
      : bLower.startsWith(searchLower) ? 1
      : aLower.startsWith(searchLower) ? -1
      // 3. lexicographic
      : a > b ? 1
      : b > a ? -1
      : 0
  }

  const children = search ? rankThoughtsSequential(
    sort(Object.values(thoughtIndex)
      .filter(thought =>
        (archived || !isArchived(thought)) &&
        thought.value !== ROOT_TOKEN &&
        thought.value !== EM_TOKEN &&
        searchRegexp.test(thought.value)
      )
      .map(thought => thought.value),
    // cannot group cases by return value because conditionals must be checked in order of precedence
    comparator)
  ) : []

  console.log(children, 'children')

  /** Sets the leaf classname dynamically. */
  const onRef = (el: HTMLElement | null) => {
    if (el) {
      (el.parentNode as HTMLElement).classList.toggle('leaf', children.length === 0)
    }
  }

  return <div
    className='search-children'
    // must go into DOM to modify the parent li classname since we do not want the li to re-render
    ref={onRef}
  >
    {!exists(store.getState(), search) && isDocumentEditable() ? <NewThought path={[] as unknown as SimplePath} label={`Create "${search}"`} value={search} type='button' /> : null}
    <span className='text-note text-small'>{formatNumber(children.length)} match{children.length === 1 ? '' : 'es'} for "{search}"</span>
    <Subthoughts
      childrenForced={children.slice(0, searchLimit)}
      log={true}
      simplePath={RANKED_ROOT}
      allowSingleContextParent={true}
      // expandable={true}
    />
    {children.length > DEFAULT_SEARCH_LIMIT ? <a className='indent text-note' onClick={
      () => dispatch(setSearchLimit({ value: searchLimit ?? 0 + DEFAULT_SEARCH_LIMIT }))
    }>More...</a> : null}
  </div>
}

export default connect(mapStateToProps)(SearchSubthoughts)
