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

// select next editable and prevent default keydown
const onKeyDown = e => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectNextEditable(e.target)
  }
}

const mapStateToProps = ({ search, archived }) => ({ search, archived })

const Search = ({ search, dispatch }) => {

  const ref = React.createRef()
  const state = store.getState()

  const onFocus = () => {
    dispatch({ type: 'setCursor', thoughtsRanked: null })
  }

  const onChange = e => {
    const newValue = strip(e.target.value)

    // safari adds <br> to empty contenteditables after editing, so strip thnem out
    // make sure empty thoughts are truly empty
    if (ref.current && newValue.length === 0) {
      ref.current.innerHTML = newValue
    }

    debouncedSearch(newValue, state.archived, dispatch)
  }

  const onArchiveChange = e => {
    debouncedSearch(state.search, e.target.checked, dispatch)
  }

  const focusOnRef = el => {
    ref.current = el
    if (el) {
      el.focus()
    }
  }

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
        <SearchSubthoughts search={state.search} archived={state.archived} />
      </li>
    </ul>
  </React.Fragment> : null
}

export default connect(mapStateToProps)(Search)
