import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'

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
  rankItemsSequential,
} from '../util.js'

export const SearchChildren = connect(
  ({ data, search }) => ({
    data,
    search
  })
)(({ search }) => {

  if (!search) return null

  const children = search ? rankItemsSequential(
    Object.keys(store.getState().data).filter(key =>
      key !== ROOT_TOKEN && (new RegExp(search, 'gi')).test(key)
    )
    // cannot group cases by return value because conditionals must be checked in order of precedence
    .sort((a,b) =>
      // 1. exact match
      b.toLowerCase() === search.toLowerCase() ? 1
      : a.toLowerCase() === search.toLowerCase() ? -1
      // 2. starts with search
      : b.toLowerCase().startsWith(search.toLowerCase()) ? 1
      : a.toLowerCase().startsWith(search.toLowerCase()) ? -1
      // 3. lexicographic
      : a > b ? 1
      : b > a ? -1
      : 0
    )
  ) : []

  return <div
    // must go into DOM to modify the parent li classname since we do not want the li to re-render
    ref={el => {
      if (el) {
        el.parentNode.classList.toggle('leaf', children.length === 0)
      }
    }}
  >
    {!exists(search) ? <NewItem contextRanked={[]} label={`Create "${search}"`} value={search} /> : null}
    <Children
      childrenForced={children}
      focus={RANKED_ROOT}
      itemsRanked={RANKED_ROOT}
      // expandable={true}
    />
  </div>
})

