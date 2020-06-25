import React from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { store } from '../store'

// components
import ContentEditable from 'react-contenteditable'
import SearchIcon from './SearchIcon'
import SearchSubthoughts from './SearchSubthoughts'

// util
import {
  selectNextEditable,
  strip,
} from '../util'

// milliseconds to delay the search function for performance
const SEARCH_DEBOUNCE_WAIT = 180

const debouncedSearch = _.debounce(
  (newValue, archived, dispatch) => dispatch({ type: 'search', value: newValue, archived })
  , SEARCH_DEBOUNCE_WAIT)

/** Select next editable and prevent default keydown. */
const onKeyDown = e => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectNextEditable(e.target)
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
// const mapStateToProps = ({ archived }) => ({ search, archived })

/** Searches all thoughts. */
const Search = ({ dispatch }) => {

  const ref = React.createRef()
  const state = store.getState()

  /** Removes the normal cursor when the search is focused. */
  const onFocus = () => {
    dispatch({ type: 'setCursor', thoughtsRanked: null })
  }

  /** Handles when the search input has changed. */
  const onChange = e => {
    const newValue = strip(e.target.value)

    // safari adds <br> to empty contenteditables after editing, so strip thnem out
    // make sure empty thoughts are truly empty
    if (ref.current && newValue.length === 0) {
      ref.current.innerHTML = newValue
    }

    debouncedSearch(newValue, state.archived, dispatch)
  }

  /** Re-executes the search when the archive option is changed. */
  const onArchiveChange = e => {
    // pass the latest search value from store
    debouncedSearch(store.getState().search, e.target.checked, dispatch)
  }

  /** Focuses the search input when the element is first rendered. */
  const focusOnRef = el => {
    ref.current = el
    if (el) {
      el.focus()
    }
  }

  return state.search != null ? <React.Fragment>
    <ul style={{ marginTop: 0 }} >
      <li className='child'>
        <div className='search-container'>
          <span className='bullet-search' role='img' aria-label='Search'><SearchIcon size={16} /></span>
          <div className='thought'>
            <ContentEditable
              className='editable search'
              html={state.search}
              placeholder='Search'
              innerRef={focusOnRef}
              onFocus={onFocus}
              onKeyDown={onKeyDown}
              onChange={onChange}
            />
          </div>
        </div>
        <div className="archive-check">
          <label><input type="checkbox" onChange={onArchiveChange} defaultChecked={false} /> Archive</label>
        </div>
        <SearchSubthoughts/>
      </li>
    </ul>
  </React.Fragment> : null
}

export default connect()(Search)
