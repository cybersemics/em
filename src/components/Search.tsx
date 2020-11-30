import React, { useRef } from 'react'
import { connect } from 'react-redux'
import _ from 'lodash'
import { store } from '../store'
import { selectNextEditable, strip } from '../util'
import { Connected } from '../types'
import { search, setCursor } from '../action-creators'

// components
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import SearchIcon from './SearchIcon'
import SearchSubthoughts from './SearchSubthoughts'

// milliseconds to delay the search function for performance
const SEARCH_DEBOUNCE_WAIT = 180

const debouncedSearch = _.debounce(
  (newValue, archived, dispatch) => dispatch(search({ value: newValue, archived }))
  , SEARCH_DEBOUNCE_WAIT)

/** Select next editable and prevent default keydown. */
const onKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectNextEditable(e.target as HTMLElement)
  }
}

/** Searches all thoughts. */
const Search = ({ dispatch }: Connected<any>) => {

  const ref = useRef<HTMLElement>()
  const state = store.getState()

  /** Removes the normal cursor when the search is focused. */
  const onFocus = () => {
    dispatch(setCursor({ path: null }))
  }

  /** Handles when the search input has changed. */
  const onChange = (e: ContentEditableEvent) => {
    const newValue = strip(e.target.value)

    // safari adds <br> to empty contenteditables after editing, so strip thnem out
    // make sure empty thoughts are truly empty
    if (ref.current && newValue.length === 0) {
      ref.current.innerHTML = newValue
    }

    debouncedSearch(newValue, state.archived, dispatch)
  }

  /** Re-executes the search when the archive option is changed. */
  const onArchiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // pass the latest search value from store
    debouncedSearch(store.getState().search, e.target.checked, dispatch)
  }

  /** Focuses the search input when the element is first rendered. */
  const focusOnRef = (el: HTMLElement) => {
    ref.current = el
    if (el) {
      el.focus()
    }
  }

  return <ul style={{ marginTop: 0 }} >
    <li className='child'>
      <div className='search-container'>
        <span className='bullet-search' role='img' aria-label='Search'><SearchIcon size={16} /></span>
        <div className='thought'>
          <ContentEditable
            className='editable search'
            html={state.search ?? ''}
            placeholder='Search'
            innerRef={focusOnRef}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            onChange={onChange}
          />
        </div>
      </div>
      <div className='archive-check'>
        <label><input type='checkbox' onChange={onArchiveChange} defaultChecked={false} /> Archive</label>
      </div>
      <SearchSubthoughts/>
    </li>
  </ul>
}

export default connect()(Search)
