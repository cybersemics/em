import { isEqual } from 'lodash'
import React, { FC, memo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import SortPreference from '../@types/SortPreference'
import { setSortPreferenceActionCreator as setSortPreference } from '../actions/setSortPreference'
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

// Define the type for sort options
type SortType = 'None' | 'Alphabetical'

// Define the interface for sort option configuration
interface SortOptionConfig {
  type: SortType
  supportsDirection: boolean
  label: string
}

/** Sort Option component for individual sort options. */
interface SortOptionProps {
  option: SortOptionConfig
  sortPreference: SortPreference
  onClick: (type: SortType, e: React.MouseEvent | React.TouchEvent) => void
}

/** Render each sort option. */
const SortOption: FC<SortOptionProps> = ({ option, sortPreference, onClick }) => {
  const { type, supportsDirection, label } = option
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
const SortPicker: FC<{ fontSize: number; cssRaw?: SystemStyleObject }> = memo(({ fontSize, cssRaw }) => {
  const ref = useRef<HTMLDivElement>(null)
  const dispatch = useDispatch()
  const overflow = useWindowOverflow(ref)

  const simplePath = useSelector(state =>
    state.cursor && !isRoot(state.cursor) ? simplifyPath(state, rootedParentOf(state, state.cursor)) : null,
  )

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

    if (!simplePath) return

    const newSortPreference: SortPreference = {
      type,
      direction:
        type === 'None' ? null : sortPreference.type === type && sortPreference.direction === 'Asc' ? 'Desc' : 'Asc',
    }

    dispatch([
      setSortPreference({
        simplePath,
        sortPreference: newSortPreference,
      }),
      toggleSortPicker({ value: false }),
    ])
  }

  // Define the sort options as purely declarative data
  const sortOptions: SortOptionConfig[] = [
    {
      type: 'None',
      supportsDirection: false,
      label: 'None',
    },
    {
      type: 'Alphabetical',
      supportsDirection: true,
      label: 'Alphabetical',
    },
  ]

  return (
    <div className={css({ userSelect: 'none' })}>
      <div
        ref={ref}
        style={{ ...(overflow.left ? { left: `${overflow.left}` } : { right: `${overflow.right}` }) }}
        className={css(
          {
            background: 'pickerBg',
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
          {sortOptions.map(option => (
            <SortOption key={option.type} option={option} sortPreference={sortPreference} onClick={toggleSortOption} />
          ))}
        </div>
      </div>
    </div>
  )
})

SortPicker.displayName = 'SortPicker'

export default SortPicker
