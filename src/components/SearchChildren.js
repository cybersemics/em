import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'

// components
import { Children } from './Children.js'

// constants
import {
  RANKED_ROOT,
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  rankItemsSequential,
} from '../util.js'

export const SearchChildren = connect(
  ({ data, search }) => ({
    search
  })
)(({ search, children }) => {
  children = search ? rankItemsSequential(Object.keys(store.getState().data).filter(key =>
    key !== ROOT_TOKEN && (new RegExp(search, 'gi')).test(key)
  )) : []
  return <div
    // must go into DOM to modify the parent li classname since we do not want the li to re-render
    ref={el => {
      if (el) {
        el.parentNode.classList.toggle('leaf', children.length === 0)
      }
    }}
  >
    <Children
      childrenForced={children}
      focus={RANKED_ROOT}
      itemsRanked={RANKED_ROOT}
      // expandable={true}
    />
  </div>
})

