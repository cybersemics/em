import { rgbToHex } from '@mui/material'
import React, { FC, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import { textColorActionCreator as textColor } from '../actions/textColor'
import { isTouch } from '../browser'
import * as selection from '../device/selection'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import commandStateStore from '../stores/commandStateStore'
import fastClick from '../util/fastClick'
import head from '../util/head'
import TriangleDown from './TriangleDown'
import TextColorIcon from './icons/TextColor'

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
  cursorStyle?: React.CSSProperties
  shape?: 'text' | 'bullet'
  size?: number
}> = ({ backgroundColor, color, cursorStyle, label, shape, size }) => {
  const dispatch = useDispatch()
  const colors = useSelector(themeColors)
  const fontSize = useSelector(state => state.fontSize)
  size = size || fontSize * 1.2

  /** A function that adds an alpha channel to a hex color. */
  const addAlphaToHex = (hex: string) => {
    if (hex.length === 7) return hex + 'ff'
    return hex
  }

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
    const selectedTextHexColor = cursorStyle?.color ? addAlphaToHex(rgbToHex(cursorStyle?.color)) : undefined
    const selectedBackHexColor = cursorStyle?.backgroundColor
      ? addAlphaToHex(rgbToHex(cursorStyle?.backgroundColor))
      : undefined
    if (
      (cursorStyle?.color === undefined && cursorStyle?.backgroundColor === undefined) ||
      (selectedTextHexColor === '#ccccccff' && selectedBackHexColor === '#333333ff') ||
      (selectedTextHexColor === addAlphaToHex(rgbToHex(themeColor.fg)) &&
        selectedBackHexColor === addAlphaToHex(rgbToHex(themeColor.bg)) &&
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
      (textHexColor && textHexColor === selectedTextHexColor) ||
      (backHexColor && backHexColor === selectedBackHexColor)
    )
  })

  /** Toggles the text color to the clicked swatch. */
  const toggleTextColor = (e: React.MouseEvent | React.TouchEvent) => {
    // stop toolbar button dip
    e.stopPropagation()
    e.preventDefault()
    if (backgroundColor || color !== 'default') dispatch(formatSelection('foreColor', color || colors.bg))
    else dispatch(formatSelection('foreColor', colors.fg))
    // Apply background color to the selection
    if (backgroundColor && backgroundColor !== colors.bg)
      dispatch(formatSelection('backColor', backgroundColor === 'inverse' ? colors.fg : backgroundColor))
    else {
      dispatch(formatSelection('backColor', colors.bg))

      /** Function to check if a style(background) should be removed based on the color and background-color. */
      const shouldRemoveStyle = (styleString: string) => {
        const styleLower = styleString.toLowerCase()
        const hasBackgroundColor = styleLower.includes('background-color')
        const colorMatch = styleLower.match(/color\s*:\s*([^;]+);?/)
        const elementColor = colorMatch ? colorMatch[1].trim() : null
        const isDifferentColor = elementColor && elementColor !== rgbToHex(colors.bg)
        if ((elementColor && isDifferentColor) || (label === 'default' && hasBackgroundColor)) return true
        return false
      }
      dispatch((dispatch, getState) => {
        const state = getState()
        if (!state.cursor) return
        const thought = getThoughtById(state, head(state.cursor))
        const simplePath = simplifyPath(state, state.cursor)
        const styleAttrPattern = /style\s*=\s*["'][^"']*["']/gi
        //Replace style attributes based on the conditions
        const newThoughtValue = thought.value.replace(styleAttrPattern, match => {
          if (shouldRemoveStyle(match)) return ''
          return match
        })
        dispatch(
          editThought({
            oldValue: thought.value,
            newValue: newThoughtValue,
            path: simplePath,
          }),
        )
      })
    }

    dispatch(
      textColor({
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
  const backgroundColor = commandStateStore.useSelector(state => state.backColor as string | undefined)
  const color = commandStateStore.useSelector(state => state.foreColor as string | undefined)

  // Memoize the cursorStyle object so that it only updates when backgroundColor or color changes
  const cursorStyle = useMemo(
    () => ({
      backgroundColor,
      color,
    }),
    [backgroundColor, color],
  )

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
          <ColorSwatch cursorStyle={cursorStyle} color={colors.fg} label='default' />
          <ColorSwatch cursorStyle={cursorStyle} color={colors.gray} label='gray' />
          <ColorSwatch cursorStyle={cursorStyle} color={colors.orange} label='orange' />
          <ColorSwatch cursorStyle={cursorStyle} color={colors.yellow} label='yellow' />
          <ColorSwatch cursorStyle={cursorStyle} color={colors.green} label='green' />
          <ColorSwatch cursorStyle={cursorStyle} color={colors.blue} label='blue' />
          <ColorSwatch cursorStyle={cursorStyle} color={colors.purple} label='purple' />
          <ColorSwatch cursorStyle={cursorStyle} color={colors.pink} label='pink' />
          <ColorSwatch cursorStyle={cursorStyle} color={colors.red} label='red' />
        </div>

        {/* Background Color */}
        <div aria-label='background color swatches' style={{ whiteSpace: 'nowrap' }}>
          <ColorSwatch cursorStyle={cursorStyle} backgroundColor={colors.fg} label='inverse' />
          <ColorSwatch cursorStyle={cursorStyle} backgroundColor={colors.gray} label='gray' />
          <ColorSwatch cursorStyle={cursorStyle} backgroundColor={colors.orange} label='orange' />
          <ColorSwatch cursorStyle={cursorStyle} backgroundColor={colors.yellow} label='yellow' />
          <ColorSwatch cursorStyle={cursorStyle} backgroundColor={colors.green} label='green' />
          <ColorSwatch cursorStyle={cursorStyle} backgroundColor={colors.blue} label='blue' />
          <ColorSwatch cursorStyle={cursorStyle} backgroundColor={colors.purple} label='purple' />
          <ColorSwatch cursorStyle={cursorStyle} backgroundColor={colors.pink} label='pink' />
          <ColorSwatch cursorStyle={cursorStyle} backgroundColor={colors.red} label='red' />
        </div>
      </div>
    </div>
  )
}

export default ColorPicker
