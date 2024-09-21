import _ from 'lodash'
import React, { FC, useRef } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'
import { useDispatch } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { editable, thought } from '../../styled-system/recipes'
import { searchActionCreator as search } from '../actions/search'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import store from '../stores/app'
import strip from '../util/strip'
import SearchIcon from './SearchIcon'
import SearchSubthoughts from './SearchSubthoughts'

// milliseconds to delay the search function for performance
const SEARCH_DEBOUNCE_WAIT = 180

const debouncedSearch = _.debounce(
  (newValue, archived, dispatch) => dispatch(search({ value: newValue, archived })),
  SEARCH_DEBOUNCE_WAIT,
)

/** Select next editable and prevent default keydown. */
const onKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    throw new Error('TODO: Search onKeyDown')
  }
}

/** Searches all thoughts. */
const Search: FC = () => {
  const ref = useRef<HTMLElement>()
  const dispatch = useDispatch()
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

  return (
    <ul style={{ marginTop: 0 }}>
      <li className='child'>
        <div className={css({ display: 'flex' })}>
          <span
            className={css({
              position: 'absolute',
              marginTop: '-2px',
              marginLeft: '-12px',
            })}
            role='img'
            aria-label='Search'
          >
            <SearchIcon size={16} />
          </span>
          <div className={thought({ flex: true })}>
            <ContentEditable
              className={cx(
                editable(),
                css({
                  '&[contenteditable]': {
                    display: 'block',
                    paddingTop: 0,
                  },
                  // 'empty'
                  '&:empty::before': {
                    paddingTop: '2px',
                  },
                }),
              )}
              html={state.search ?? ''}
              placeholder='Search'
              innerRef={focusOnRef}
              onFocus={onFocus}
              onKeyDown={onKeyDown}
              onChange={onChange}
            />
          </div>
        </div>
        <div className={css({ marginLeft: '-12px', marginTop: '5px' })}>
          <label className={css({ cursor: 'pointer', fontSize: '12px' })}>
            <input type='checkbox' onChange={onArchiveChange} defaultChecked={false} /> Archive
          </label>
        </div>
        <SearchSubthoughts />
      </li>
    </ul>
  )
}

export default Search
