import React from 'react'
import { connect } from 'react-redux'
import { store } from '../store.js'

// components
import ContentEditable from 'react-contenteditable'
import { SearchChildren } from './SearchChildren.js'

// constants
import {
  ROOT_TOKEN,
} from '../constants.js'

// util
import {
  equalItemsRanked,
  rankItemsSequential,
  selectNextEditable,
  sigKey,
  strip,
} from '../util.js'

export const Search = connect(({ search }) => ({ show: search != null }))(({ show, dispatch }) => {
  const ref = React.createRef()
  const state = store.getState()
  return show ? <React.Fragment>
    <ul style={{ marginTop: 0 }} >
      <li className='child'><div className='thought'>
          <ContentEditable
            className='editable search'
            html=''
            placeholder='Search'
            innerRef={el => {
              ref.current = el
              if (el) {
                el.focus()
              }
            }}
            onFocus={() => {
              dispatch({ type: 'setCursor', itemsRanked: null })
            }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                selectNextEditable(e.target)
              }
            }}
            onChange={e => {
              const newValue = strip(e.target.value)

              // safari adds <br> to empty contenteditables after editing, so strip thnem out
              // make sure empty items are truly empty
              if (ref.current && newValue.length === 0) {
                ref.current.innerHTML = newValue
              }

              dispatch({ type: 'search', value: newValue })
            }}
          />
        </div>
        <SearchChildren children={state.search ? rankItemsSequential(Object.keys(state.data).filter(key =>
          key !== ROOT_TOKEN && (new RegExp(state.search, 'gi')).test(key)
        )) : []} />
      </li>
    </ul>
  </React.Fragment> : null
})
