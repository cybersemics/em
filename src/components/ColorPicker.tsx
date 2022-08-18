import React, { FC, useEffect, useRef, useState } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import State from '../@types/State'
import textColor from '../action-creators/textColor'
import getStyle from '../selectors/getStyle'
import themeColors from '../selectors/themeColors'
import head from '../util/head'
import TriangleDown from './TriangleDown'
import TextColorIcon from './icons/TextColor'

/** A hook that returns the left and right overflow of the element outside the bounds of the screen. Includes the Toolbar's scrollLeft to position the triangle. Do not re-calculate on every render or it will create an infinite loop when scrolling the Toolbar. */
const useWindowOverflow = (ref: React.RefObject<HTMLElement>) => {
  const [overflow, setOverflow] = useState({ scrollLeft: 0, left: 0, right: 0, width: 0 })

  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const left = Math.max(0, -rect.x)
    // add 10px for padding
    const right = Math.max(0, rect.x + rect.width - window.innerWidth) + 10
    if (left > 0 || right > 0) {
      const scrollLeft = ref.current.closest('.toolbar')?.scrollLeft || 0
      setOverflow({ scrollLeft, left, right: right, width: rect.width })
    }
  }, [])

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
  const fontSize = useSelector((state: State) => state.fontSize)
  const selected =
    (color && cursorStyle?.color === color) || (backgroundColor && cursorStyle?.backgroundColor === backgroundColor)
  size = size || fontSize * 1.2
  return (
    <span
      aria-label={label || color || backgroundColor}
      onTouchStart={e => {
        // prevent toolbar button dip
        e.stopPropagation()
      }}
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
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
      }}
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
            border: 'none',
            fontWeight: selected ? 'bold' : 'normal',
            color: backgroundColor ? 'black' : color,
            margin: '3px 5px 5px',
            ...(selected ? { outline: `solid 1px ${colors.gray66}` } : null),
          }}
        />
      )}
    </span>
  )
}

/** Text Color Picker component. */
const ColorPicker: FC<{ fontSize: number }> = ({ fontSize }) => {
  const colors = useSelector(themeColors)
  const ref = useRef<HTMLDivElement>(null)
  const cursorStyle = useSelector(
    (state: State) =>
      state.showColorPicker && state.cursor
        ? {
            // merge =style (which contains color) and =styleAnnotation (which contains backgroundColor)
            // the style attribute name is not relevant here
            ...(getStyle(state, head(state.cursor)) || ({} as React.CSSProperties)),
            ...getStyle(state, head(state.cursor), { attributeName: '=styleAnnotation' }),
          }
        : undefined,
    shallowEqual,
  )

  const overflow = useWindowOverflow(ref)

  // offset the triangle by the right overflow so that it stays even with the ColorPicker's inner div
  // include -10 to match the additional pixels added to the inner div's overflow for padding
  // do not exceed half the width of the ref, otherwise the triangle will disconnect from the ColorPicker
  const triangleOffset = -Math.min(overflow.width / 2 - fontSize, overflow.scrollLeft - overflow.right)

  return (
    <div
      ref={ref}
      style={{
        userSelect: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: colors.overlay10,
          borderRadius: 3,
          display: 'inline-block',
          padding: `${fontSize / 4}px 0.5em ${fontSize / 2}px`,
          position: 'relative',
          right: overflow.right,
        }}
      >
        {/* Triangle */}
        <TriangleDown
          fill={colors.overlay10}
          size={fontSize}
          style={{
            position: 'absolute',
            left: triangleOffset,
            top: -9.1,
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
