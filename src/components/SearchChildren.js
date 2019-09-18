import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'
import * as escapeStringRegexp from 'escape-string-regexp'

// components
import { Children } from './Children.js'
import { NewItem } from './NewItem.js'

// constants
import {
  RANKED_ROOT,
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  exists,
  formatNumber,
  rankItemsSequential,
} from '../util.js'

/** number of thoughts to limit the search results to by default */
const DEFAULT_SEARCH_LIMIT = 20

export const SearchChildren = connect(
  ({ data, search, searchLimit }) => ({
    data,
    search,
    searchLimit
  })
)(({ search, searchLimit = DEFAULT_SEARCH_LIMIT, dispatch }) => {

  if (!search) return null

  const children = search ? rankItemsSequential(
    Object.keys(store.getState().data).filter(key =>
      key !== ROOT_TOKEN && (new RegExp(escapeStringRegexp(search), 'gi')).test(key)
    )
    // cannot group cases by return value because conditionals must be checked in order of precedence
    .sort((a,b) => {
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
    })
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
    {!exists(search) ? <NewItem contextRanked={[]} label={`Create "${search}"`} value={search} type='button' /> : null}
    <span className='text-note text-small'>{formatNumber(children.length)} match{children.length === 1 ? '' : 'es'} for "{search}":</span>
    <Children
      childrenForced={children.slice(0, searchLimit)}
      focus={RANKED_ROOT}
      itemsRanked={RANKED_ROOT}
      // expandable={true}
    />
    {children.length > DEFAULT_SEARCH_LIMIT ? <a className='indent text-note' onClick={
      () => dispatch({ type: 'searchLimit', value: searchLimit + DEFAULT_SEARCH_LIMIT })
    }>More...</a> : null}
  </div>
})

