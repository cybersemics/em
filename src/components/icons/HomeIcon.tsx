import React from 'react'
import { useSelector } from 'react-redux'
import themeColors from '../../selectors/themeColors'

/** A home icon. */
const HomeIcon = ({ color, size, style }: { color?: string; size?: number; style?: React.CSSProperties }) => {
  const colors = useSelector(themeColors)
  return (
    <span role='img' aria-label='home' className='logo-wrapper'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width={size || 24}
        height={size || 24}
        viewBox='0 0 24 24'
        className='logo'
        fill={color || colors.fg}
        style={style}
      >
        <path d='M0 0h24v24H0z' fill='none' />
      </svg>
    </span>
  )
}

export default HomeIcon
