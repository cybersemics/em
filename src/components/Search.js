import React from 'react'
import { connect } from 'react-redux'
import * as debounce from 'lodash.debounce'
import { store } from '../store.js'
import { isMobile } from '../browser.js'
import { globalShortcuts } from '../shortcuts.js'

// components
import ContentEditable from 'react-contenteditable'
import { SearchChildren } from './SearchChildren.js'
import { GestureDiagram } from './GestureDiagram.js'

// util
import {
  formatNumber,
  selectNextEditable,
  strip,
} from '../util.js'

// milliseconds to delay the search function for performance
const SEARCH_DEBOUNCE_WAIT = 180

const debouncedSearch = debounce(
  (newValue, dispatch) => dispatch({ type: 'search', value: newValue })
, SEARCH_DEBOUNCE_WAIT)

export const Search = connect(({ search }) => ({ show: search != null }))(({ show, dispatch }) => {
  const ref = React.createRef()
  const state = store.getState()
  const totalThoughts = Object.keys(state.data).length - 1 // -1 for ROOT
  return show ? <React.Fragment>
    <ul style={{ marginTop: 0 }} >
      <li className='child'>
        <span className='bullet-search' role='img' aria-label='Search'>🔍</span>
        <div className='thought'>
          <ContentEditable
            className='editable search'
            html=''
            placeholder={`Search ${formatNumber(totalThoughts)} thought${totalThoughts === 1 ? '' : 's'}`}
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

              debouncedSearch(newValue, dispatch)
            }}
          />
        </div>
        <SearchChildren search={state.search} />
      </li>
    </ul>
    <span className='text-note text-small'>{isMobile ? <span>Swipe <GestureDiagram path={globalShortcuts().find(shortcut => shortcut.name === 'Search').gesture} size='14' color='darkgray' /></span> : 'Type Escape'} to close the search.</span>
  </React.Fragment> : null
})
