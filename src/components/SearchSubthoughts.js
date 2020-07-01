import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store'

// components
import Subthoughts from './Subthoughts'
import NewThought from './NewThought'

// constants
import {
  EM_TOKEN,
  RANKED_ROOT,
  ROOT_TOKEN,
} from '../constants'

// util
import {
  escapeRegExp,
  formatNumber,
  isArchived,
  isDocumentEditable,
  rankThoughtsSequential,
  sort,
} from '../util'

// selectors
import { exists } from '../selectors'

/** Number of thoughts to limit the search results to by default. */
const DEFAULT_SEARCH_LIMIT = 20

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = ({ archived, search, searchLimit, thoughts: { thoughtIndex } }) => ({
  archived,
  search,
  searchLimit,
  thoughtIndex,
})

/** Subthoughts of search. */
const SearchSubthoughts = ({ search, archived, searchLimit = DEFAULT_SEARCH_LIMIT, thoughtIndex, dispatch }) => {

  if (!search) return null

  const searchRegexp = new RegExp(escapeRegExp(search), 'gi')

  /** Compares two values lexicographically, sorting exact matches to the top. */
  const comparator = (a, b) => {
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

  /** Sets the leaf classname dynamically. */
  const onRef = el => {
    if (el) {
      el.parentNode.classList.toggle('leaf', children.length === 0)
    }
  }

  return <div
    className='search-children'
    // must go into DOM to modify the parent li classname since we do not want the li to re-render
    ref={onRef}
  >
    {!exists(store.getState(), search) && isDocumentEditable() ? <NewThought path={[]} label={`Create "${search}"`} value={search} type='button' /> : null}
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
}

export default connect(mapStateToProps)(SearchSubthoughts)
