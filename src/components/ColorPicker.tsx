import React, { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import { isTouch } from '../browser'
import { ColorToken } from '../colors.config'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import themeColors from '../selectors/themeColors'
import commandStateStore from '../stores/commandStateStore'
import head from '../util/head'
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
    const currentThoughtValue = (!!state.cursor && getThoughtById(state, head(state.cursor))?.value) || ''
    const themeColor = themeColors(state)
    /* Define the color and background color regex to get the current color of current thought
       document.execCommand('foreColor') adds the color attribute with hex and document.execCommand('backColor') adds the background-color attribute with the rgb
       document.execCommand('foreColor') always sets the color as hex whether the value is rgb or hex. And document.execCommand('backColor') always sets the background with the rgb
    */
    const colorRegex = /color="#([0-9a-fA-F]{6})"/g
    const bgColorRegex = /background-color:\s*(rgb\(\d{1,3},\s?\d{1,3},\s?\d{1,3}\))/g
    const textHexColor = color ? addAlphaToHex(rgbToHex(themeColor[color])) : undefined
    const backHexColor = backgroundColor ? addAlphaToHex(rgbToHex(themeColor[backgroundColor])) : undefined
    if (
      (!commandStateColor && !commandStateBackgroundColor) ||
      (commandStateColor === '#ccccccff' && commandStateBackgroundColor === '#333333ff') ||
      (commandStateColor === addAlphaToHex(rgbToHex(themeColor.fg)) &&
        commandStateBackgroundColor === addAlphaToHex(rgbToHex(themeColor.bg)) &&
        !selection.isOnThought())
    ) {
      const colorMatches = currentThoughtValue.match(colorRegex) || []

      let matchColor, match
      // Get the colors and background colors used in current thought's value
      const fgColors: Set<string> = new Set()
      if (colorMatches) {
        // colorMatches will be like this : [color="#ee82ee", color="#ff823e"] and match.slice(7, -1) will be #ee82ee
        // If the thought is colored with many colors, matchColor will be null and if the thought is colored with one color, matchColor will be that color
        colorMatches.forEach(match => fgColors.add(match.slice(7, -1)))
        matchColor = fgColors.size > 1 ? null : fgColors.values().next().value
      }

      const bgColors: Set<string> = new Set()
      while ((match = bgColorRegex.exec(currentThoughtValue)) !== null) if (match[1]) bgColors.add(match[1])
      const matchBgColor = bgColors.size > 1 ? null : bgColors.values().next().value

      return !!(
        (textHexColor && textHexColor === (matchColor && addAlphaToHex(rgbToHex(matchColor)))) ||
        (backHexColor && backHexColor === (matchBgColor && addAlphaToHex(rgbToHex(matchBgColor))))
      )
    }
    return !!(
      (textHexColor && textHexColor === commandStateColor) ||
      (backHexColor && backHexColor === commandStateBackgroundColor)
    )
  })

  /** Toggles the text color to the clicked swatch. If the swatch is already selected, sets text color and background color back to default. */
  const toggleTextColor = () => {
    dispatch(
      formatSelection(
        'foreColor',
        selected ? 'fg' : color || (backgroundColor && backgroundColor !== 'fg' ? 'black' : 'bg'),
      ),
    )

    // Apply background color to the selection
    dispatch(formatSelection('backColor', selected ? 'bg' : (backgroundColor ?? 'bg')))
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
