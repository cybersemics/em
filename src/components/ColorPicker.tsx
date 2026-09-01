import React, { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { formatSelectionColorActionCreator as formatSelectionColor } from '../actions/formatSelectionColor'
import { isTouch } from '../browser'
import { ColorToken } from '../colors.config'
import themeColors from '../selectors/themeColors'
import commandStateStore from '../stores/commandStateStore'
import isColorSelected from '../util/isColorSelected'
import Popover from './Popover'
import TextColorIcon from './icons/TextColor'

/** A small, square color swatch that can be picked in the color picker. */
const ColorSwatch: FC<{
  backgroundColor?: ColorToken
  color?: ColorToken
  // aria-label; defaults to color or background color
  label?: string
  shape?: 'text' | 'bullet'
  size?: number
}> = ({ backgroundColor, color, label, shape, size }) => {
  const dispatch = useDispatch()
  const fontSize = useSelector(state => state.fontSize)
  const commandStateForeColor = commandStateStore.useSelector(state => state.foreColor)
  const commandStateBackColor = commandStateStore.useSelector(state => state.backColor)

  size = size || fontSize * 1.2

  const selected = useSelector(state =>
    isColorSelected(
      themeColors(state),
      { foreColor: commandStateForeColor, backColor: commandStateBackColor },
      { color, backgroundColor },
    ),
  )

  /** Toggles the text color to the clicked swatch. If the swatch is already selected, sets text color and background color back to default. */
  const toggleTextColor = () => {
    dispatch(formatSelectionColor({ color, backgroundColor }))
  }

  /** Toggles the text color onTouchEnd or onClick on desktop. */
  const tapUp = (e: React.MouseEvent | React.TouchEvent) => {
    // stop toolbar button dip and click empty space
    e.stopPropagation()
    e.preventDefault()

    toggleTextColor()
  }

  return (
    <span
      aria-label={label || color || backgroundColor}
      onClick={isTouch ? undefined : tapUp}
      onTouchEnd={isTouch ? tapUp : undefined}
      className={css({ cursor: 'pointer' })}
    >
      {shape === 'bullet' ? (
        <span
          className={css({
            display: 'inline-block',
            margin: '3px 5px 5px',
            textAlign: 'center',
          })}
          style={{
            color: color && token(`colors.${color}` as const),
            fontSize: size,
            width: size - 1,
            height: size - 1,
          }}
        >
          •
        </span>
      ) : (
        <TextColorIcon
          cssRaw={css.raw({
            // TODO: Why does border crash the browser?
            // Even hardcoding 'solid 1px white' crashes the browser.
            // See: https://github.com/cybersemics/em/issues/2508
            // border: selected ? `solid 1px {colors.fg}` : `solid 1px transparent`,
            fontWeight: selected ? 'bold' : 'normal',
            margin: '3px 5px 5px',
          })}
          size={size}
          style={{
            color: backgroundColor ? token('colors.bg') : color && token(`colors.${color}` as const),
            backgroundColor: backgroundColor && token(`colors.${backgroundColor}` as const),
            fontWeight: selected ? 'bold' : 'normal',
          }}
          fill={selected ? token('colors.fg') : 'none'}
        />
      )}
    </span>
  )
}

/** Text Color Picker component. */
const ColorPicker: FC<{ size?: number }> = ({ size }) => {
  const showColorPicker = useSelector(state => state.showColorPicker)

  return (
    <Popover show={showColorPicker} size={size}>
      {/* Text Color */}
      <div aria-label='text color swatches' className={css({ whiteSpace: 'nowrap' })}>
        <ColorSwatch color='fg' label='default' />
        <ColorSwatch color='gray' label='gray' />
        <ColorSwatch color='orange' label='orange' />
        <ColorSwatch color='yellow' label='yellow' />
        <ColorSwatch color='green' label='green' />
        <ColorSwatch color='blue' label='blue' />
        <ColorSwatch color='purple' label='purple' />
        <ColorSwatch color='pink' label='pink' />
        <ColorSwatch color='red' label='red' />
      </div>

      {/* Background Color */}
      <div aria-label='background color swatches' className={css({ whiteSpace: 'nowrap' })}>
        <ColorSwatch backgroundColor='fg' label='inverse' />
        <ColorSwatch backgroundColor='gray' label='gray' />
        <ColorSwatch backgroundColor='orange' label='orange' />
        <ColorSwatch backgroundColor='yellow' label='yellow' />
        <ColorSwatch backgroundColor='green' label='green' />
        <ColorSwatch backgroundColor='blue' label='blue' />
        <ColorSwatch backgroundColor='purple' label='purple' />
        <ColorSwatch backgroundColor='pink' label='pink' />
        <ColorSwatch backgroundColor='red' label='red' />
      </div>
    </Popover>
  )
}

export default ColorPicker
