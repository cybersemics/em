import React from 'react'
import Icon from '../../@types/Icon'

/** Italic icon. */
const ItalicTextIcon = ({ style, size }: Icon) => {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      version='1.1'
      x='0'
      y='0'
      viewBox='0 0 20 20'
      className='icon'
      width={size}
      height={size}
      style={{ ...style, width: style?.width ? parseInt(style.width.toString()) * 0.875 : undefined }}
    >
      <path d='m16 1h-6a1 1 0 0 0 0 2h1.557l-5.25 14h-2.307a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-1.557l5.25-14h2.307a1 1 0 0 0 0-2z'></path>
    </svg>
  )
}

export default ItalicTextIcon
