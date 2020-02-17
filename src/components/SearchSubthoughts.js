import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'

// components
import { Subthoughts } from './Subthoughts.js'
import { NewThought } from './NewThought.js'

// constants
import {
  EM_TOKEN,
  RANKED_ROOT,
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  escapeRegExp,
  exists,
  formatNumber,
  rankThoughtsSequential,
  sort,
} from '../util.js'

/** number of thoughts to limit the search results to by default */
const DEFAULT_SEARCH_LIMIT = 20

export const SearchSubthoughts = connect(
  ({ thoughtIndex, search, searchLimit }) => ({
    thoughtIndex,
    search,
    searchLimit
  })
)(({ search, searchLimit = DEFAULT_SEARCH_LIMIT, dispatch }) => {

  if (!search) return null

  const searchRegexp = new RegExp(escapeRegExp(search), 'gi')
  const thoughtIndex = store.getState().thoughtIndex

  const children = search ? rankThoughtsSequential(
    sort(Object.values(thoughtIndex)
      .filter(thought =>
        thought.value !== ROOT_TOKEN &&
        thought.value !== EM_TOKEN &&
        searchRegexp.test(thought.value)
      )
      .map(thought => thought.value),
      // cannot group cases by return value because conditionals must be checked in order of precedence
      (a, b) => {
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
    )
  ) : []

  return <div
    className='search-children'
    // must go into DOM to modify the parent li classname since we do not want the li to re-render
    ref={el => {
      if (el) {
        el.parentNode.classList.toggle('leaf', children.length === 0)
      }
    }}
  >
    {!exists(search) ? <NewThought path={[]} label={`Create "${search}"`} value={search} type='button' /> : null}
    <span className='text-note text-small'>{formatNumber(children.length)} match{children.length === 1 ? '' : 'es'} for "{search}"</span>
    <Subthoughts
      childrenForced={children.slice(0, searchLimit)}
      thoughtsRanked={RANKED_ROOT}
      allowSingleContextParent={true}
      // expandable={true}
    />
    {children.length > DEFAULT_SEARCH_LIMIT ? <a className='indent text-note' onClick={
      () => dispatch({ type: 'searchLimit', value: searchLimit + DEFAULT_SEARCH_LIMIT })
    }>More...</a> : null}
  </div>
})
