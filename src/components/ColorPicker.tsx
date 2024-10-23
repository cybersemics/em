import { rgbToHex } from '@mui/material'
import React, { FC, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
import { bulletColorActionCreator as bulletColor } from '../actions/bulletColor'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import { isTouch } from '../browser'
import * as selection from '../device/selection'
import useWindowOverflow from '../hooks/useWindowOverflow'
import getThoughtById from '../selectors/getThoughtById'
import themeColors from '../selectors/themeColors'
import commandStateStore from '../stores/commandStateStore'
import fastClick from '../util/fastClick'
import head from '../util/head'
import TriangleDown from './TriangleDown'
import TextColorIcon from './icons/TextColor'

/** A function that adds an alpha channel to a hex color. */
const addAlphaToHex = (hex: string) => (hex.length === 7 ? hex + 'ff' : hex)

/** A small, square color swatch that can be picked in the color picker. */
const ColorSwatch: FC<{
  backgroundColor?: string
  color?: string
  // aria-label; defaults to color or background color
  label?: string
  shape?: 'text' | 'bullet'
  size?: number
}> = ({ backgroundColor, color, label, shape, size }) => {
  const dispatch = useDispatch()
  const colors = useSelector(themeColors)
  const fontSize = useSelector(state => state.fontSize)
  const commandStateBackgroundColor = commandStateStore.useSelector(state =>
    state.backColor ? addAlphaToHex(rgbToHex(state.backColor as string)) : null,
  )
  const commandStateColor = commandStateStore.useSelector(state =>
    state.foreColor ? addAlphaToHex(rgbToHex(state.foreColor as string)) : null,
  )

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
    const textHexColor = color ? addAlphaToHex(rgbToHex(color)) : undefined
    const backHexColor = backgroundColor ? addAlphaToHex(rgbToHex(backgroundColor)) : undefined
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

  /** Toggles the text color to the clicked swatch. */
  const toggleTextColor = (e: React.MouseEvent | React.TouchEvent) => {
    // stop toolbar button dip
    e.stopPropagation()
    e.preventDefault()
    if (backgroundColor || color !== 'default') {
      dispatch(formatSelection('foreColor', color || colors.bg))
    } else {
      dispatch(formatSelection('foreColor', colors.fg))
    }
    // Apply background color to the selection
    if (backgroundColor && backgroundColor !== colors.bg) {
      dispatch(formatSelection('backColor', backgroundColor === 'inverse' ? colors.fg : backgroundColor))
    } else {
      dispatch(formatSelection('backColor', colors.bg))
    }

    dispatch(
      bulletColor({
        ...(selected
          ? {
              color: 'default',
            }
          : color
            ? { color: label }
            : {
                backgroundColor: label,
              }),
        shape,
      }),
    )
  }
  return (
    <span
      aria-label={label || color || backgroundColor}
      {...fastClick(e => {
        // stop click empty space
        e.stopPropagation()
      })}
      onTouchStart={toggleTextColor}
      // only add mousedown to desktop, otherwise it will activate twice on mobile
      onMouseDown={!isTouch ? toggleTextColor : undefined}
      className={css({ cursor: 'pointer' })}
    >
      {shape === 'bullet' ? (
        <span
          className={css({
            display: 'inline-block',
            margin: '3px 5px 5px',
            textAlign: 'center',
          })}
          style={{ color, fontSize: size, width: size - 1, height: size - 1 }}
        >
          •
        </span>
      ) : (
        <TextColorIcon
          cssRaw={css.raw({
            border: selected ? `solid 1px {colors.fg}` : `solid 1px transparent`,
            fontWeight: selected ? 'bold' : 'normal',
            margin: '3px 5px 5px',
          })}
          size={size}
          style={{ color: backgroundColor ? 'black' : color, backgroundColor }}
        />
      )}
    </span>
  )
}

/** Text Color Picker component. */
const ColorPicker: FC<{ fontSize: number; cssRaw?: SystemStyleObject }> = ({ fontSize, cssRaw }) => {
  const colors = useSelector(themeColors)
  const ref = useRef<HTMLDivElement>(null)

  const overflow = useWindowOverflow(ref)

  return (
    <div className={css({ userSelect: 'none' })}>
      <div
        className={css(
          {
            backgroundColor: 'fgOverlay90',
            borderRadius: 3,
            display: 'inline-block',
            padding: '0.2em 0.25em 0.25em',
            position: 'relative',
          },
          cssRaw,
        )}
        ref={ref}
        style={{ ...(overflow.left ? { left: overflow.left } : { right: overflow.right }) }}
      >
        {/* Triangle */}
        <TriangleDown
          fill={token('colors.fgOverlay90')}
          cssRaw={css.raw({ position: 'absolute', width: '100%' })}
          size={fontSize}
          style={{ ...(overflow.left ? { left: -overflow.left } : { right: -overflow.right }), top: -fontSize / 2 }}
        />

        {/* Text Color */}
        <div aria-label='text color swatches' style={{ whiteSpace: 'nowrap' }}>
          <ColorSwatch color={colors.fg} label='default' />
          <ColorSwatch color={colors.gray} label='gray' />
          <ColorSwatch color={colors.orange} label='orange' />
          <ColorSwatch color={colors.yellow} label='yellow' />
          <ColorSwatch color={colors.green} label='green' />
          <ColorSwatch color={colors.blue} label='blue' />
          <ColorSwatch color={colors.purple} label='purple' />
          <ColorSwatch color={colors.pink} label='pink' />
          <ColorSwatch color={colors.red} label='red' />
        </div>

        {/* Background Color */}
        <div aria-label='background color swatches' style={{ whiteSpace: 'nowrap' }}>
          <ColorSwatch backgroundColor={colors.fg} label='inverse' />
          <ColorSwatch backgroundColor={colors.gray} label='gray' />
          <ColorSwatch backgroundColor={colors.orange} label='orange' />
          <ColorSwatch backgroundColor={colors.yellow} label='yellow' />
          <ColorSwatch backgroundColor={colors.green} label='green' />
          <ColorSwatch backgroundColor={colors.blue} label='blue' />
          <ColorSwatch backgroundColor={colors.purple} label='purple' />
          <ColorSwatch backgroundColor={colors.pink} label='pink' />
          <ColorSwatch backgroundColor={colors.red} label='red' />
        </div>
      </div>
    </div>
  )
}

export default ColorPicker
