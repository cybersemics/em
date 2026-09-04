import React, { FC, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import BulletStyle from '../@types/BulletStyle'
import { setBulletStyleActionCreator as setBulletStyle } from '../actions/setBulletStyle'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { isTouch } from '../browser'
import attribute from '../selectors/attribute'
import findDescendant from '../selectors/findDescendant'
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
  { label: 'Times', value: 'Time' },
  { label: 'None', value: 'None' },
]

// Step options offered once Times is selected, written as the child of =children/=bullet/Time. The second is the default.
const TIME_STEP_OPTIONS = ['5min', '15min', '30min', '1h']

/** Renders a single menu option. */
const BulletOption: FC<{
  label: string
  isSelected: boolean
  onClick: (e: React.MouseEvent | React.TouchEvent) => void
}> = ({ label, isSelected, onClick }) => (
  <div
    title={label}
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
    aria-label={label}
    {...fastClick(e => e.stopPropagation())}
    onTouchStart={onClick}
    onMouseDown={e => !isTouch && onClick(e)}
  >
    <span>{label}</span>
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

  /** The step literal under =children/=bullet/Time of the cursor's parent, or null. */
  const timeStep = useSelector(state => {
    if (!state.cursor || isRoot(state.cursor)) return null
    const simplePath = simplifyPath(state, rootedParentOf(state, state.cursor))
    return attribute(state, findDescendant(state, head(simplePath), ['=children', '=bullet']), 'Time')
  })

  /** Applies the selected bullet style to the cursor's parent and closes the dropdown. Times is applied with the default step and keeps the dropdown open so that the step can be chosen without a second trip to the bullet. */
  const selectBulletStyle = (value: BulletStyle, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()

    dispatch((dispatch, getState) => {
      const state = getState()
      if (!state.cursor || isRoot(state.cursor)) return

      const simplePath = simplifyPath(state, rootedParentOf(state, state.cursor))
      dispatch([
        setBulletStyle({
          simplePath,
          value,
          // Reselecting Times on a Time list must not reset a step that has already been chosen.
          ...(value === 'Time' && getBulletStyle(state, head(simplePath)) !== 'Time'
            ? { step: TIME_STEP_OPTIONS[1] }
            : null),
        }),
        value === 'Time' ? null : toggleDropdown({ dropDownType: 'bulletPicker', value: false }),
      ])
    })
  }

  /** Writes the selected step under =children/=bullet/Time of the cursor's parent and closes the dropdown. */
  const selectTimeStep = (step: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    e.preventDefault()

    dispatch((dispatch, getState) => {
      const state = getState()
      if (!state.cursor || isRoot(state.cursor)) return

      dispatch([
        setBulletStyle({
          simplePath: simplifyPath(state, rootedParentOf(state, state.cursor)),
          value: 'Time',
          step,
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
            label={option.label}
            isSelected={bulletStyle === option.value}
            onClick={e => selectBulletStyle(option.value, e)}
          />
        ))}
        {bulletStyle === 'Time' && (
          <div
            aria-label='time step options'
            className={css({
              display: 'flex',
              justifyContent: 'center',
              borderTop: 'solid 1px {colors.fgOverlay20}',
              marginTop: '2px',
              paddingTop: '2px',
            })}
          >
            {TIME_STEP_OPTIONS.map(step => (
              <BulletOption
                key={step}
                label={step}
                isSelected={timeStep === step}
                onClick={e => selectTimeStep(step, e)}
              />
            ))}
          </div>
        )}
      </div>
    </Popover>
  )
})

BulletPicker.displayName = 'BulletPicker'

export default BulletPicker
