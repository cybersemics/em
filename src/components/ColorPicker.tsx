import React, { FC } from 'react'
import { useDispatch } from 'react-redux'
import textColor from '../action-creators/textColor'
import TextColorIcon from './icons/TextColor'

/** A small, square color swatch that can be picked in the color picker. */
const ColorSwatch: FC<{ backgroundColor?: string; color?: string; shape?: 'text' | 'bullet'; size?: number }> = ({
  backgroundColor,
  color,
  shape,
  size,
}) => {
  const dispatch = useDispatch()
  size = size || 20
  const margin = '3px 3px 8px 3px'
  return (
    <span
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
      <div style={{ marginBottom: -2 }}>
        <ColorSwatch shape='bullet' color='white' />
        <ColorSwatch shape='bullet' color='gray' />
        <ColorSwatch shape='bullet' color='orange' />
        <ColorSwatch shape='bullet' color='#ffee14' />
        <ColorSwatch shape='bullet' color='mediumspringgreen' />
        <ColorSwatch shape='bullet' color='mediumseagreen' />
        <ColorSwatch shape='bullet' color='dodgerblue' />
        <ColorSwatch shape='bullet' color='mediumpurple' />
        <ColorSwatch shape='bullet' color='violet' />
        <ColorSwatch shape='bullet' color='pink' />
        <ColorSwatch shape='bullet' color='tomato' />
      </div>

      {/* Text Color */}
      <div>
        <ColorSwatch color='white' />
        <ColorSwatch color='gray' />
        <ColorSwatch color='orange' />
        <ColorSwatch color='#ffee14' />
        <ColorSwatch color='mediumspringgreen' />
        <ColorSwatch color='mediumseagreen' />
        <ColorSwatch color='dodgerblue' />
        <ColorSwatch color='mediumpurple' />
        <ColorSwatch color='violet' />
        <ColorSwatch color='pink' />
        <ColorSwatch color='tomato' />
      </div>

      {/* Background Color */}
      <div>
        <ColorSwatch backgroundColor='white' />
        <ColorSwatch backgroundColor='gray' />
        <ColorSwatch backgroundColor='orange' />
        <ColorSwatch backgroundColor='#ffee14' />
        <ColorSwatch backgroundColor='mediumspringgreen' />
        <ColorSwatch backgroundColor='mediumseagreen' />
        <ColorSwatch backgroundColor='dodgerblue' />
        <ColorSwatch backgroundColor='mediumpurple' />
        <ColorSwatch backgroundColor='violet' />
        <ColorSwatch backgroundColor='pink' />
        <ColorSwatch backgroundColor='tomato' />
      </div>
    </div>
  )
}

export default ColorPicker
