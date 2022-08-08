import React, { FC, useEffect, useRef } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import State from '../@types/State'
import textColor from '../action-creators/textColor'
import getStyle from '../selectors/getStyle'
import themeColors from '../selectors/themeColors'
import head from '../util/head'
import TriangleDown from './TriangleDown'
import TextColorIcon from './icons/TextColor'

/** A hook that keeps the element in the viewing window. If the element is too wide to fit on the screen, aligns it to the left edge. */
const useKeepInWindow = (ref: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const overflowLeft = rect.x
    const overflowRight = rect.x + rect.width - window.innerWidth
    if (overflowRight > 0) {
      ref.current.style.marginLeft = `-${overflowRight + 35}px`
    } else if (overflowLeft < 0) {
      ref.current.style.marginLeft = '10px'
    }
  }, [])
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
  const selected =
    (color && cursorStyle?.color === color) || (backgroundColor && cursorStyle?.backgroundColor === backgroundColor)
  size = size || 20
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
                  color: 'white',
                }
              : {
                  backgroundColor,
                  color,
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
        ? getStyle(state, head(state.cursor)) || ({} as React.CSSProperties)
        : ({} as React.CSSProperties),
    shallowEqual,
  )

  useKeepInWindow(ref)

  return (
    <div
      ref={ref}
      style={{
        backgroundColor: colors.overlay10,
        borderRadius: 3,
        display: 'inline-block',
        padding: `0 0.5em ${fontSize / 2}px`,
        userSelect: 'none',
      }}
    >
      {/* Triangle */}
      <TriangleDown
        fill={colors.overlay10}
        size={fontSize}
        style={{ position: 'absolute', left: 0, right: 0, top: -9.1, width: '100%' }}
      />

      {/* Bullet Color */}
      <div aria-label='bullet color swatches' style={{ marginBottom: -2, whiteSpace: 'nowrap' }}>
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='white' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='gray' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='orange' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='#ffee14' label='yellow' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='mediumspringgreen' label='spring green' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='mediumseagreen' label='sea green' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='dodgerblue' label='blue' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='mediumpurple' label='purple' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='violet' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='pink' />
        <ColorSwatch cursorStyle={cursorStyle} shape='bullet' color='tomato' label='red' />
      </div>

      {/* Text Color */}
      <div aria-label='text color swatches' style={{ whiteSpace: 'nowrap' }}>
        <ColorSwatch cursorStyle={cursorStyle} color='white' />
        <ColorSwatch cursorStyle={cursorStyle} color='gray' />
        <ColorSwatch cursorStyle={cursorStyle} color='orange' />
        <ColorSwatch cursorStyle={cursorStyle} color='#ffee14' label='yellow' />
        <ColorSwatch cursorStyle={cursorStyle} color='mediumspringgreen' label='spring green' />
        <ColorSwatch cursorStyle={cursorStyle} color='mediumseagreen' label='sea green' />
        <ColorSwatch cursorStyle={cursorStyle} color='dodgerblue' label='blue' />
        <ColorSwatch cursorStyle={cursorStyle} color='mediumpurple' label='purple' />
        <ColorSwatch cursorStyle={cursorStyle} color='violet' />
        <ColorSwatch cursorStyle={cursorStyle} color='pink' />
        <ColorSwatch cursorStyle={cursorStyle} color='tomato' label='red' />
      </div>

      {/* Background Color */}
      <div aria-label='background color swatches' style={{ whiteSpace: 'nowrap' }}>
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='white' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='gray' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='orange' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='#ffee14' label='yellow' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='mediumspringgreen' label='spring green' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='mediumseagreen' label='sea green' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='dodgerblue' label='blue' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='mediumpurple' label='purple' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='violet' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='pink' />
        <ColorSwatch cursorStyle={cursorStyle} backgroundColor='tomato' label='red' />
      </div>
    </div>
  )
}

export default ColorPicker
