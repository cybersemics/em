import React, { FC, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import BulletStyle from '../@types/BulletStyle'
import { setBulletStyleActionCreator as setBulletStyle } from '../actions/setBulletStyle'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { isTouch } from '../browser'
import getBulletStyle from '../selectors/getBulletStyle'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isRoot from '../util/isRoot'
import Popover from './Popover'

/** A bullet style menu option. `value` is the `=bullet` attribute value it applies (null for the default filled bullet). */
interface BulletStyleOption {
  label: string
  value: BulletStyle
}

// Menu options in display order.
const BULLET_STYLE_OPTIONS: BulletStyleOption[] = [
  { label: 'Bullets', value: null },
  { label: 'Numbers', value: 'Ordered' },
  { label: 'Letters', value: 'Alpha' },
  { label: 'None', value: 'None' },
]

/** Renders a single bullet style option. */
const BulletOption: FC<{
  option: BulletStyleOption
  isSelected: boolean
  onClick: (value: BulletStyle, e: React.MouseEvent | React.TouchEvent) => void
}> = ({ option, isSelected, onClick }) => (
  <div
    title={option.label}
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
      fontSize: '0.8rem',
      borderRadius: '2px',
    })}
    aria-label={option.label}
    {...fastClick(e => e.stopPropagation())}
    onTouchStart={e => onClick(option.value, e)}
    onMouseDown={e => !isTouch && onClick(option.value, e)}
  >
    <span>{option.label}</span>
  </div>
)

/** A dropdown menu for choosing the bullet style of the current list, applied via `=children/=bullet` on the cursor's parent. */
const BulletPicker: FC<{ size?: number }> = memo(({ size }) => {
  const dispatch = useDispatch()
  const showBulletPicker = useSelector(state => state.showBulletPicker)

  const bulletStyle = useSelector(state => {
    if (!state.cursor || isRoot(state.cursor)) return null
    const simplePath = simplifyPath(state, rootedParentOf(state, state.cursor))
    return getBulletStyle(state, head(simplePath))
  })

  /** Applies the selected bullet style to the cursor's parent and closes the dropdown. */
  const selectBulletStyle = (value: BulletStyle, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()

    dispatch((dispatch, getState) => {
      const state = getState()
      if (!state.cursor || isRoot(state.cursor)) return

      dispatch([
        setBulletStyle({
          simplePath: simplifyPath(state, rootedParentOf(state, state.cursor)),
          value,
        }),
        toggleDropdown({ dropDownType: 'bulletPicker', value: false }),
      ])
    })
  }

  return (
    <Popover show={showBulletPicker} size={size}>
      <div aria-label='bullet style options' className={css({ whiteSpace: 'wrap' })}>
        {BULLET_STYLE_OPTIONS.map(option => (
          <BulletOption
            key={option.label}
            option={option}
            isSelected={bulletStyle === option.value}
            onClick={selectBulletStyle}
          />
        ))}
      </div>
    </Popover>
  )
})

BulletPicker.displayName = 'BulletPicker'

export default BulletPicker
