import { FC, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import Thought from '../@types/Thought'
import { errorActionCreator as error } from '../actions/error'
import { searchLimitActionCreator as setSearchLimit } from '../actions/searchLimit'
import { EM_TOKEN, HOME_TOKEN } from '../constants'
import hasLexeme from '../selectors/hasLexeme'
import store from '../stores/app'
import escapeRegex from '../util/escapeRegex'
import fastClick from '../util/fastClick'
import formatNumber from '../util/formatNumber'
import isDocumentEditable from '../util/isDocumentEditable'
import sort from '../util/sort'
import NewThought from './NewThought'

/** Number of thoughts to limit the search results to by default. */
const DEFAULT_SEARCH_LIMIT = 20

/** Subthoughts of search. */
const SearchSubthoughts: FC = () => {
  const [isRemoteSearching, setIsRemoteSearching] = useState(false)
  const [isLocalSearching, setIsLocalSearching] = useState(false)

  const dispatch = useDispatch()
  const search = useSelector(state => state.search)
  const remoteSearch = useSelector(state => state.remoteSearch)
  const searchLimit = useSelector(state => state.searchLimit || DEFAULT_SEARCH_LIMIT)
  const thoughtIndex = useSelector(state => state.thoughts.thoughtIndex)

  /**
   * Search thoughts remotely or locally and add it to pullQueue.
   */
  const searchThoughts = async (value: string) => {
    throw new Error('Not implemented')
    // const searchLocal = localSearch(store.getState())

    const setLoadingState = remoteSearch ? setIsRemoteSearching : setIsLocalSearching
    setLoadingState(true)
    try {
      // const contextMap = remoteSearch ? {} : (await searchLocal).searchAndGenerateContextMap(value)
      // dispatch(searchContexts({ value: contextMap }))
    } catch (err) {
      const errorMessage = `${remoteSearch ? 'Remote' : 'Local'} search failed`
      dispatch(error({ value: errorMessage }))
      console.error(errorMessage)
    }
    setLoadingState(false)
  }

  useEffect(
    () => {
      if (search) searchThoughts(search)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, remoteSearch],
  )

  if (!search) return null

  if (isRemoteSearching || isLocalSearching) return <div>...searching</div>

  const searchRegexp = new RegExp(escapeRegex(search), 'gi')

  /** Compares two values lexicographically, sorting exact matches to the top. */
  const comparator = (a: Thought, b: Thought) => {
    const aLower = a.value.toLowerCase()
    const bLower = b.value.toLowerCase()
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
        Object.values(thoughtIndex).filter(
          thought =>
            // (archived || !isArchived(store.getState(), lexeme)) &&
            thought.value !== HOME_TOKEN && thought.value !== EM_TOKEN && searchRegexp.test(thought.value),
        ),
        comparator,
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
      {/* TODO: VirtualTree */}
      {/* <Subthoughts
        childrenForced={children.slice(0, searchLimit).map(({ id }) => id)}
        simplePath={HOME_PATH}
        allowSingleContextParent={true}
        expandable={true}
      /> */}
      {children.length > DEFAULT_SEARCH_LIMIT ? (
        <a
          className='indent text-note'
          {...fastClick(() => dispatch(setSearchLimit({ value: searchLimit + DEFAULT_SEARCH_LIMIT })))}
        >
          More...
        </a>
      ) : null}
    </div>
  )
}

export default SearchSubthoughts
