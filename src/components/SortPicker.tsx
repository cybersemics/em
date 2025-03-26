import moize from 'moize'
import React, { FC, memo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import { toggleSortActionCreator as toggleSort } from '../actions/toggleSort'
import { toggleSortPickerActionCreator as toggleSortPicker } from '../actions/toggleSortPicker'
import { isTouch } from '../browser'
import useWindowOverflow from '../hooks/useWindowOverflow'
import getSortPreference from '../selectors/getSortPreference'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isRoot from '../util/isRoot'
import TriangleDown from './TriangleDown'

// Default sort preference object
const DEFAULT_SORT_PREFERENCE = { type: 'None', direction: null }

// Memoized selector to avoid creating new objects on each render
const getSortPreferenceSelector = moize(
  (state, cursor) => {
    if (!cursor || isRoot(cursor)) return DEFAULT_SORT_PREFERENCE

    const path = rootedParentOf(state, cursor)
    const simplePath = simplifyPath(state, path)
    const id = head(simplePath)

    return getSortPreference(state, id)
  },
  {
    maxSize: 100,
    profileName: 'getSortPreferenceSelector',
  },
)

/** Sort Picker component. */
const SortPicker: FC<{ fontSize: number; cssRaw?: SystemStyleObject }> = memo(({ fontSize, cssRaw }) => {
  const ref = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()
  const overflow = useWindowOverflow(ref)

  const cursor = useSelector(state => state.cursor)
  const path = useSelector(state => (cursor && !isRoot(cursor) ? rootedParentOf(state, cursor) : null))
  const simplePath = useSelector(state => (path ? simplifyPath(state, path) : null))

  const sortPreference = useSelector(state => getSortPreferenceSelector(state, state.cursor))

  /** Toggles the sort option. */
  const toggleSortOption = (type: 'None' | 'Alphabetical', e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (!cursor || isRoot(cursor) || !simplePath) return

    // Close the dropdown after selection
    dispatch(toggleSortPicker({ value: false }))

    if (type === 'None') {
      // If current type is already None, do nothing
      if (sortPreference.type === 'None') return

      // We need to toggle to None from whatever current state
      // Call toggleSort a few times to cycle through to None
      // In the current implementation, toggleSort cycles through:
      // None -> Alphabetical/Asc -> Alphabetical/Desc -> None
      if (sortPreference.type === 'Alphabetical') {
        if (sortPreference.direction === 'Asc') {
          // Asc -> Desc -> None
          dispatch(toggleSort({ simplePath })) // To Desc
          dispatch(toggleSort({ simplePath })) // To None
        } else {
          // Desc -> None
          dispatch(toggleSort({ simplePath })) // To None
        }
      }
    } else if (type === 'Alphabetical') {
      // If current type is None, set to Alphabetical/Asc
      if (sortPreference.type === 'None') {
        dispatch(toggleSort({ simplePath })) // To Alphabetical/Asc
      }
      // If current type is already Alphabetical, toggle direction
      else if (sortPreference.type === 'Alphabetical') {
        // Toggle direction: Asc -> Desc or Desc -> Asc
        dispatch(toggleSort({ simplePath })) // To cycle
        if (sortPreference.direction === 'Desc') {
          // If currently Desc, toggle twice to get to Asc
          // Desc -> None -> Asc
          dispatch(toggleSort({ simplePath })) // To Asc
        }
      }
    }
  }

  return (
    <div className={css({ userSelect: 'none' })}>
      <div
        ref={ref}
        style={{ ...(overflow.left ? { left: `${overflow.left}` } : { right: `${overflow.right}` }) }}
        className={css(
          {
            background: 'letterCasePickerBg',
            borderRadius: '3',
            display: 'inline-block',
            padding: '0.2em 0.25em 0.25em',
            position: 'relative',
          },
          cssRaw,
        )}
      >
        <TriangleDown
          fill={token('colors.fgOverlay90')}
          size={fontSize}
          cssRaw={{ position: 'absolute', width: '100%' }}
          style={{ ...(overflow.left ? { left: -overflow.left } : { right: -overflow.right }), top: -fontSize / 2 }}
        />

        <div aria-label='sort options' className={css({ whiteSpace: 'wrap' })}>
          <div
            key='None'
            title='None'
            className={css({
              margin: '2px',
              padding: '4px 8px',
              lineHeight: '1.5',
              border: sortPreference.type === 'None' ? `solid 1px {colors.fg}` : `solid 1px {colors.transparent}`,
              cursor: 'pointer',
              fontSize: '0.9em',
              borderRadius: '2px',
            })}
            aria-label='None'
            {...fastClick(e => e.stopPropagation())}
            onTouchStart={e => toggleSortOption('None', e)}
            onMouseDown={e => !isTouch && toggleSortOption('None', e)}
          >
            None
          </div>
          <div
            key='Alphabetical'
            title='Alphabetical'
            className={css({
              margin: '2px',
              padding: '4px 8px',
              lineHeight: '1.5',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              border:
                sortPreference.type === 'Alphabetical' ? `solid 1px {colors.fg}` : `solid 1px {colors.transparent}`,
              cursor: 'pointer',
              fontSize: '0.9em',
              borderRadius: '2px',
            })}
            aria-label='Alphabetical'
            {...fastClick(e => e.stopPropagation())}
            onTouchStart={e => toggleSortOption('Alphabetical', e)}
            onMouseDown={e => !isTouch && toggleSortOption('Alphabetical', e)}
          >
            <span className={css({ marginRight: '4px' })}>
              {sortPreference.type === 'Alphabetical' && sortPreference.direction === 'Asc' && '↓ '}
              {sortPreference.type === 'Alphabetical' && sortPreference.direction === 'Desc' && '↑ '}
            </span>
            <span>Alphabetical</span>
          </div>
        </div>
      </div>
    </div>
  )
})

SortPicker.displayName = 'SortPicker'

export default SortPicker
