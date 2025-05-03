import { isEqual } from 'lodash'
import React, { FC, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import SortPreference from '../@types/SortPreference'
import { setSortPreferenceActionCreator as setSortPreference } from '../actions/setSortPreference'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { isTouch } from '../browser'
import getSortPreference from '../selectors/getSortPreference'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isRoot from '../util/isRoot'
import Popover from './Popover'

// Define the type for sort options
type SortType = 'None' | 'Alphabetical' | 'Created' | 'Updated'

/** Sort Option component for individual sort options. */
interface SortOptionProps {
  type: SortType
  /** If true, the option can be toggled to switch between Asc and Desc sort direction, and will display an arrow indicating the current sort direction. */
  supportsDirection: boolean
  label: string
  /** Current sort preference. */
  sortPreference: SortPreference
  onClick: (type: SortType, e: React.MouseEvent | React.TouchEvent) => void
}

/** Render each sort option. */
const SortOption: FC<SortOptionProps> = ({ type, supportsDirection, label, sortPreference, onClick }) => {
  const isSelected = sortPreference.type === type

  return (
    <div
      key={type}
      title={type}
      className={css({
        margin: '2px',
        padding: '4px 8px',
        lineHeight: '1.5',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        border: isSelected ? `solid 1px {colors.fg}` : `solid 1px {colors.transparent}`,
        cursor: 'pointer',
        fontSize: '0.9em',
        borderRadius: '2px',
      })}
      aria-label={type}
      {...fastClick(e => e.stopPropagation())}
      onTouchStart={e => onClick(type, e)}
      onMouseDown={e => !isTouch && onClick(type, e)}
    >
      {isSelected && supportsDirection && (
        <span className={css({ marginRight: '4px' })}>
          {sortPreference.direction === 'Asc' && '↓ '}
          {sortPreference.direction === 'Desc' && '↑ '}
        </span>
      )}
      <span>{label}</span>
    </div>
  )
}

/** Sort Picker component. */
const SortPicker: FC<{ size?: number }> = memo(({ size }) => {
  const dispatch = useDispatch()
  const showSortPicker = useSelector(state => state.showSortPicker)

  const sortPreference = useSelector(state => {
    if (!state.cursor || isRoot(state.cursor)) return { type: 'None', direction: null }

    const path = rootedParentOf(state, state.cursor)
    const simplePath = simplifyPath(state, path)
    const id = head(simplePath)

    return getSortPreference(state, id)
  }, isEqual)

  /** Sets the sort type. If the sort type is already selected, toggles the direction. */
  const toggleSortOption = (type: SortType, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()

    dispatch((dispatch, getState) => {
      const state = getState()
      if (!state.cursor) return

      dispatch([
        setSortPreference({
          simplePath: simplifyPath(state, rootedParentOf(state, state.cursor)),
          sortPreference: {
            type,
            direction:
              type === 'None'
                ? null
                : sortPreference.type === type && sortPreference.direction === 'Asc'
                  ? 'Desc'
                  : 'Asc',
          },
        }),
        toggleDropdown({ dropDownType: 'sortPicker', value: false }),
      ])
    })
  }

  return (
    <Popover show={showSortPicker} size={size}>
      <div aria-label='sort options' className={css({ whiteSpace: 'wrap' })}>
        <SortOption
          type='None'
          supportsDirection={false}
          label='None'
          sortPreference={sortPreference}
          onClick={toggleSortOption}
        />
        <SortOption
          type='Alphabetical'
          supportsDirection={true}
          label='Alphabetical'
          sortPreference={sortPreference}
          onClick={toggleSortOption}
        />
        <SortOption
          type='Created'
          supportsDirection={true}
          label='Created'
          sortPreference={sortPreference}
          onClick={toggleSortOption}
        />
        <SortOption
          type='Updated'
          supportsDirection={true}
          label='Updated'
          sortPreference={sortPreference}
          onClick={toggleSortOption}
        />
      </div>
    </Popover>
  )
})

SortPicker.displayName = 'SortPicker'

export default SortPicker
