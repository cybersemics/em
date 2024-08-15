import { rgbToHex } from '@mui/material'
import React, { FC, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { formatSelectionActionCreator as formatSelection } from '../actions/formatSelection'
import { textColorActionCreator as textColor } from '../actions/textColor'
import { isTouch } from '../browser'
// import getStyle from '../selectors/getStyle'
import themeColors from '../selectors/themeColors'
import commandStateStore from '../stores/commandStateStore'
import fastClick from '../util/fastClick'
// import head from '../util/head'
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
  const [selected, setSelected] = useState(false)
  size = size || fontSize * 1.2
  const addAlphaToHex = (hex: string) => {
    if (hex.length === 7) return hex + 'ff'
    return hex
  }

  useEffect(() => {
    let hex1 = color ? addAlphaToHex(rgbToHex(color)) : undefined
    let hex2 = backgroundColor ? addAlphaToHex(rgbToHex(backgroundColor)) : undefined
    let hex3 = cursorStyle?.color ? addAlphaToHex(rgbToHex(cursorStyle?.color)) : undefined
    let hex4 = cursorStyle?.backgroundColor ? addAlphaToHex(rgbToHex(cursorStyle?.backgroundColor)) : undefined
    setSelected(!!((hex1 && hex1 === hex3) || (hex2 && hex2 === hex4)))
  }, [cursorStyle])
  /** Toggles the text color to the clicked swatch. */
  const toggleTextColor = async (e: React.MouseEvent | React.TouchEvent) => {
    // stop toolbar button dip
    e.stopPropagation()

    // Apply text color to the selection
    if (backgroundColor || color !== 'default')
      await dispatch(formatSelection('foreColor', color || 'rgba(0, 0, 0, 1)'))

    // Apply background color to the selection
    if (backgroundColor && backgroundColor !== colors.bg)
      await dispatch(formatSelection('backColor', backgroundColor === 'inverse' ? colors.fg : backgroundColor))

    await dispatch(
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
  const cursorStyle = {
    backgroundColor: commandStateStore.useSelector(state => state['backColor'] as string | undefined),
    color: commandStateStore.useSelector(state => state['foreColor'] as string | undefined),
  }

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
