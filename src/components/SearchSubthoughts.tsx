import React, { FC, useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { store } from '../store'
import { EM_TOKEN, HOME_PATH, HOME_TOKEN } from '../constants'
import { hasLexeme } from '../selectors'
import { searchContexts, searchLimit as setSearchLimit, error } from '../action-creators'
import { escapeRegExp, formatNumber, isArchived, isDocumentEditable, sort } from '../util'
import Subthoughts from './Subthoughts'
import NewThought from './NewThought'
import { Connected, Index, Lexeme, SimplePath, State, ThoughtId } from '../@types'
import { getRemoteSearch } from '../search/algoliaSearch'
import { getLocalSearch } from '../search/localSearch'
import getFirebaseProvider from '../data-providers/firebase'

interface SearchSubthoughtsProps {
  search?: string | null
  archived?: boolean
  searchLimit?: number
  remoteSearch: boolean
  lexemeIndex: Index<Lexeme>
}
/** Number of thoughts to limit the search results to by default. */
const DEFAULT_SEARCH_LIMIT = 20

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ archived, search, remoteSearch, searchLimit, thoughts: { lexemeIndex } }: State) => ({
  archived,
  search,
  remoteSearch,
  searchLimit,
  lexemeIndex,
})

/** Subthoughts of search. */
const SearchSubthoughts: FC<Connected<SearchSubthoughtsProps>> = ({
  remoteSearch,
  search,
  archived,
  searchLimit = DEFAULT_SEARCH_LIMIT,
  lexemeIndex,
  dispatch,
}) => {
  const [isRemoteSearching, setIsRemoteSearching] = useState(false)
  const [isLocalSearching, setIsLocalSearching] = useState(false)

  /**
   * Search thoughts remotely or locally and add it to pullQueue.
   */
  const searchThoughts = async (value: string) => {
    const searchRemote = getRemoteSearch(store.getState(), getFirebaseProvider(store.getState(), store.dispatch))

    const searchLocal = getLocalSearch(store.getState())

    const setLoadingState = remoteSearch ? setIsRemoteSearching : setIsLocalSearching
    setLoadingState(true)
    try {
      const contextMap = await (remoteSearch ? searchRemote : searchLocal).searchAndGenerateContextMap(value)
      dispatch(searchContexts({ value: contextMap }))
    } catch (err) {
      const errorMessage = `${remoteSearch ? 'Remote' : 'Local'} search failed`
      dispatch(error({ value: errorMessage }))
      console.error(errorMessage)
    }
    setLoadingState(false)
  }

  useEffect(() => {
    if (search) searchThoughts(search)
  }, [search, remoteSearch])

  if (!search) return null

  if (isRemoteSearching || isLocalSearching) return <div>...searching</div>

  const searchRegexp = new RegExp(escapeRegExp(search), 'gi')

  /** Compares two values lexicographically, sorting exact matches to the top. */
  const comparator = (a: string, b: string) => {
    const aLower = a.toLowerCase()
    const bLower = b.toLowerCase()
    const searchLower = search.toLowerCase()
    // 1. exact match
    return bLower === searchLower
      ? 1
      : aLower === searchLower
      ? -1
      : // 2. starts with search
      bLower.startsWith(searchLower)
      ? 1
      : aLower.startsWith(searchLower)
      ? -1
      : // 3. lexicographic
      a > b
      ? 1
      : b > a
      ? -1
      : 0
  }

  const children = search
    ? sort(
        Object.values(lexemeIndex)
          .filter(
            lexeme =>
              (archived || !isArchived(store.getState(), lexeme)) &&
              lexeme.value !== HOME_TOKEN &&
              lexeme.value !== EM_TOKEN &&
              searchRegexp.test(lexeme.value),
          )
          .map<{ id: ThoughtId; value: string; rank: number }>(
            // TODO: Should lexeme.id be explictly typed as ThoughtId
            (lexeme, i) => ({ id: lexeme.contexts[0], value: lexeme.value, rank: i }),
            // cannot group cases by return value because conditionals must be checked in order of precedence
            comparator,
          ),
      )
    : []

  /** Sets the leaf classname dynamically. */
  const onRef = (el: HTMLElement | null) => {
    if (el) {
      const parentNode = el.parentNode as HTMLElement
      parentNode.classList.toggle('leaf', children.length === 0)
    }
  }

  return (
    <div
      className='search-children'
      // must go into DOM to modify the parent li classname since we do not want the li to re-render
      ref={onRef}
    >
      {!hasLexeme(store.getState(), search) && isDocumentEditable() ? (
        <NewThought path={[] as unknown as SimplePath} label={`Create "${search}"`} value={search} type='button' />
      ) : null}
      <span className='text-note text-small'>
        {formatNumber(children.length)} match{children.length === 1 ? '' : 'es'} for "{search}"
      </span>
      <Subthoughts
        childrenForced={children.slice(0, searchLimit).map(({ id }) => id)}
        simplePath={HOME_PATH}
        allowSingleContextParent={true}
        expandable={true}
      />
      {children.length > DEFAULT_SEARCH_LIMIT ? (
        <a
          className='indent text-note'
          onClick={() => dispatch(setSearchLimit({ value: searchLimit + DEFAULT_SEARCH_LIMIT }))}
        >
          More...
        </a>
      ) : null}
    </div>
  )
}

export default connect(mapStateToProps)(SearchSubthoughts)
