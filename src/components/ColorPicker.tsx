import React, { FC } from 'react'
import { useDispatch } from 'react-redux'
import textColor from '../action-creators/textColor'
import TextColorIcon from './icons/TextColor'

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
  const margin = '3px 3px 8px 3px'
  return (
    <span
      aria-label={label || color || backgroundColor}
      onClick={e => {
        e.preventDefault()
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
            margin,
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
          style={{ backgroundColor, border: 'none', color: backgroundColor ? 'black' : color, margin }}
        />
      )}
    </span>
  )
}

/** Text Color Picker component. */
const ColorPicker: FC<{ fontSize: number }> = ({ fontSize }) => {
  return (
    <div
      style={{
        backgroundColor: 'rgba(20, 20, 20, 0.8)',
        borderRadius: 3,
        display: 'inline-block',
        padding: `0 0.5em ${fontSize / 2}px`,
        userSelect: 'none',
      }}
    >
      {/* Bullet Color */}
      <div aria-label='bullet color swatches' style={{ marginBottom: -2 }}>
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
      <div aria-label='text color swatches'>
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
      <div aria-label='background color swatches'>
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
