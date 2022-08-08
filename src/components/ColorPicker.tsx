import React, { FC, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import textColor from '../action-creators/textColor'
import themeColors from '../selectors/themeColors'
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
  shape?: 'text' | 'bullet'
  size?: number
}> = ({ backgroundColor, color, label, shape, size }) => {
  const dispatch = useDispatch()
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
        dispatch(textColor({ backgroundColor, color, shape }))
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
            color: backgroundColor ? 'black' : color,
            margin: '3px 5px 5px',
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
        <ColorSwatch shape='bullet' color='white' />
        <ColorSwatch shape='bullet' color='gray' />
        <ColorSwatch shape='bullet' color='orange' />
        <ColorSwatch shape='bullet' color='#ffee14' label='yellow' />
        <ColorSwatch shape='bullet' color='mediumspringgreen' label='spring green' />
        <ColorSwatch shape='bullet' color='mediumseagreen' label='sea green' />
        <ColorSwatch shape='bullet' color='dodgerblue' label='blue' />
        <ColorSwatch shape='bullet' color='mediumpurple' label='purple' />
        <ColorSwatch shape='bullet' color='violet' />
        <ColorSwatch shape='bullet' color='pink' />
        <ColorSwatch shape='bullet' color='tomato' label='red' />
      </div>

      {/* Text Color */}
      <div aria-label='text color swatches' style={{ whiteSpace: 'nowrap' }}>
        <ColorSwatch color='white' />
        <ColorSwatch color='gray' />
        <ColorSwatch color='orange' />
        <ColorSwatch color='#ffee14' label='yellow' />
        <ColorSwatch color='mediumspringgreen' label='spring green' />
        <ColorSwatch color='mediumseagreen' label='sea green' />
        <ColorSwatch color='dodgerblue' label='blue' />
        <ColorSwatch color='mediumpurple' label='purple' />
        <ColorSwatch color='violet' />
        <ColorSwatch color='pink' />
        <ColorSwatch color='tomato' label='red' />
      </div>

      {/* Background Color */}
      <div aria-label='background color swatches' style={{ whiteSpace: 'nowrap' }}>
        <ColorSwatch backgroundColor='white' />
        <ColorSwatch backgroundColor='gray' />
        <ColorSwatch backgroundColor='orange' />
        <ColorSwatch backgroundColor='#ffee14' label='yellow' />
        <ColorSwatch backgroundColor='mediumspringgreen' label='spring green' />
        <ColorSwatch backgroundColor='mediumseagreen' label='sea green' />
        <ColorSwatch backgroundColor='dodgerblue' label='blue' />
        <ColorSwatch backgroundColor='mediumpurple' label='purple' />
        <ColorSwatch backgroundColor='violet' />
        <ColorSwatch backgroundColor='pink' />
        <ColorSwatch backgroundColor='tomato' label='red' />
      </div>
    </div>
  )
}

export default ColorPicker
