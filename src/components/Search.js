import React from 'react'
import { connect } from 'react-redux'
import debounce from 'lodash.debounce'
import { store } from '../store.js'
import { isMobile } from '../browser.js'
import { shortcutById } from '../shortcuts.js'
import assert from 'assert'

// components
import ContentEditable from 'react-contenteditable'
import { SearchSubthoughts } from './SearchSubthoughts.js'
import { GestureDiagram } from './GestureDiagram.js'
import { SearchIcon } from './SearchIcon.js'

// util
import {
  selectNextEditable,
  strip,
} from '../util.js'

// milliseconds to delay the search function for performance
const SEARCH_DEBOUNCE_WAIT = 180

// assert the search shortcut at load time
const searchShortcut = shortcutById('search')
assert(searchShortcut)

const debouncedSearch = debounce(
  (newValue, dispatch) => dispatch({ type: 'search', value: newValue })
  , SEARCH_DEBOUNCE_WAIT)

export const Search = connect(state => ({ search: state.search }))(({ search, dispatch }) => {
  const ref = React.createRef()
  const state = store.getState()
  return search != null ? <React.Fragment>
    <ul style={{ marginTop: 0 }} >
      <li className='child'>
        <div className='search-container'>
          <span className='bullet-search' role='img' aria-label='Search'><SearchIcon size={16} /></span>
          <div className='thought'>
            <ContentEditable
              className='editable search'
              html={search}
              placeholder='Search'
              innerRef={el => {
                ref.current = el
                if (el) {
                  el.focus()
                }
              }}
              onFocus={() => {
                dispatch({ type: 'setCursor', thoughtsRanked: null })
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
                // make sure empty thoughts are truly empty
                if (ref.current && newValue.length === 0) {
                  ref.current.innerHTML = newValue
                }

                debouncedSearch(newValue, dispatch)
              }}
            />
          </div>
        </div>
        <SearchSubthoughts search={state.search} />
      </li>
    </ul>
    <span className='text-note text-small'>{isMobile ? <span className='gesture-container'>Swipe <GestureDiagram path={searchShortcut.gesture} size='30' color='darkgray' /></span> : 'Type Escape'} to close the search.</span>
  </React.Fragment> : null
})
