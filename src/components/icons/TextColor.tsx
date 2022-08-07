import React from 'react'
import IconType from '../../@types/Icon'

/** Descending Icon Component. */
const Icon = ({ size = 20, style }: IconType) => (
  <span className='icon' style={{ display: 'inline-block' }}>
    <span
      style={{
        border: 'solid 1.4px gray',
        borderRadius: 5,
        display: 'inline-block',
        lineHeight: 1.3,
        color: style?.fill,
        textAlign: 'center',
        ...style,
        width: size - 1,
        height: size - 1,
      }}
    >
      A
    </span>
  </span>
)

export default Icon
