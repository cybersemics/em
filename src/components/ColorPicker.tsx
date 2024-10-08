import { rgbToHex } from '@mui/material'
import React, { FC, useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import { isTouch } from '../browser'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import themeColors from '../selectors/themeColors'
import commandStateStore from '../stores/commandStateStore'
import fastClick from '../util/fastClick'
import head from '../util/head'
import TriangleDown from './TriangleDown'
import TextColorIcon from './icons/TextColor'

/** A function that adds an alpha channel to a hex color. */
const addAlphaToHex = (hex: string) => (hex.length === 7 ? hex + 'ff' : hex)

/** A hook that returns the left and right overflow of the element outside the bounds of the screen. Do not re-calculate on every render or it will create an infinite loop when scrolling the Toolbar. */
const useWindowOverflow = (ref: React.RefObject<HTMLElement>) => {
  const [overflow, setOverflow] = useState({ left: 0, right: 0 })

  useLayoutEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    // Subtract the previous overflow, since that affects the client rect.
    // Otherwise the overflow will alternate on each render as it moves on and off the screen.
    const left = Math.max(0, -rect.x + 15 - overflow.left)
    // add 10px for padding
    const right = Math.max(0, rect.x + rect.width - window.innerWidth + 10 - overflow.right)
    if (left > 0 || right > 0) {
      setOverflow({ left, right })
    }
  }, [ref, overflow.left, overflow.right])

  return overflow
}

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

    // Apply text color to the selection
    if (backgroundColor || color !== 'default') {
      dispatch(formatSelection('foreColor', color || colors.bg, { label, selected }))
    } else {
      dispatch(formatSelection('foreColor', colors.fg, { label, selected }))
    }

    // Apply background color to the selection
    if (backgroundColor && backgroundColor !== colors.bg) {
      dispatch(
        formatSelection('backColor', backgroundColor === 'inverse' ? colors.fg : backgroundColor, {
          label,
          selected,
        }),
      )
    } else {
      dispatch(formatSelection('backColor', colors.bg, { label, selected }))
    }
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
      style={{ cursor: 'pointer' }}
    >
      {shape === 'bullet' ? (
        <span
          style={{
            color,
            display: 'inline-block',
            fontSize: size,
            margin: '3px 5px 5px',
            width: size - 1,
            height: size - 1,
            textAlign: 'center',
          }}
        >
          •
        </span>
      ) : (
        <TextColorIcon
          size={size}
          style={{
            backgroundColor,
            border: `solid 1px ${selected ? colors.fg : 'transparent'}`,
            fontWeight: selected ? 'bold' : 'normal',
            color: backgroundColor ? 'black' : color,
            margin: '3px 5px 5px',
          }}
        />
      )}
    </span>
  )
}

/** Text Color Picker component. */
const ColorPicker: FC<{ fontSize: number; style?: React.CSSProperties }> = ({ fontSize, style }) => {
  const colors = useSelector(themeColors)
  const ref = useRef<HTMLDivElement>(null)

  const overflow = useWindowOverflow(ref)

  return (
    <div
      style={{
        userSelect: 'none',
      }}
    >
      <div
        ref={ref}
        style={{
          backgroundColor: colors.fgOverlay90,
          borderRadius: 3,
          display: 'inline-block',
          padding: '0.2em 0.25em 0.25em',
          position: 'relative',
          ...(overflow.left ? { left: overflow.left } : { right: overflow.right }),
          ...style,
        }}
      >
        {/* Triangle */}
        <TriangleDown
          fill={colors.fgOverlay90}
          size={fontSize}
          style={{
            position: 'absolute',
            ...(overflow.left ? { left: -overflow.left } : { right: -overflow.right }),
            top: -fontSize / 2,
            width: '100%',
          }}
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
