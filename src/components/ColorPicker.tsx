import React, { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import { isTouch } from '../browser'
import { ColorToken } from '../colors.config'
import themeColors from '../selectors/themeColors'
import batchEditingStore from '../stores/batchEditing'
import commandStateStore from '../stores/commandStateStore'
import rgbToHex from '../util/rgbToHex'
import Popover from './Popover'
import TextColorIcon from './icons/TextColor'

/** A function that adds an alpha channel to a hex color. */
const addAlphaToHex = (hex: string) => (hex.length === 7 ? hex + 'ff' : hex)

/** Extracts and cleans a color value from a potential HTML-like string. */
const getCleanColor = (color: string | null) => {
  if (!color) return null
  // Extract clean color value from potential HTML-like string.
  const colorMatch = typeof color === 'string' ? color.match(/#[0-9a-fA-F]{6}/) : null
  const cleanColor = colorMatch ? colorMatch[0] : color
  return cleanColor && typeof cleanColor === 'string' ? addAlphaToHex(rgbToHex(cleanColor)) : null
}

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
  const commandStateBackgroundColor = commandStateStore.useSelector(state => {
    return getCleanColor(typeof state.backColor === 'string' ? state.backColor : null)
  })
  const commandStateColor = commandStateStore.useSelector(state => {
    return getCleanColor(typeof state.foreColor === 'string' ? state.foreColor : null)
  })

  size = size || fontSize * 1.2

  const selected = useSelector(state => {
    const themeColor = themeColors(state)
    /* Compare the swatch color to the command state color.
       document.execCommand('foreColor') adds the color attribute with hex and document.execCommand('backColor') adds the background-color attribute with the rgb
       document.execCommand('foreColor') always sets the color as hex whether the value is rgb or hex. And document.execCommand('backColor') always sets the background with the rgb
    */
    const textHexColor = color ? addAlphaToHex(rgbToHex(themeColor[color])) : undefined
    const backHexColor = backgroundColor ? addAlphaToHex(rgbToHex(themeColor[backgroundColor])) : undefined

    return !!(
      (textHexColor && textHexColor === commandStateColor) ||
      (backHexColor && backHexColor === commandStateBackgroundColor)
    )
  })

  /** Toggles the text color to the clicked swatch. If the swatch is already selected, sets text color and background color back to default. */
  const toggleTextColor = () => {
    dispatch((dispatch, getState) => {
      // Note is semi-transparent by default and its color must be reset to that rather than white, which is the fg color for thoughts. (#3902)
      const fgColor = getState().noteFocus ? 'fgNote' : 'fg'
      dispatch(
        formatSelection(
          'foreColor',
          selected ? fgColor : color || (backgroundColor && backgroundColor !== 'fg' ? 'black' : 'bg'),
        ),
      )
    })

    batchEditingStore.update(true)
    // Apply background color to the selection
    dispatch(formatSelection('backColor', selected ? 'bg' : (backgroundColor ?? 'bg')))
    batchEditingStore.update(false)
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
