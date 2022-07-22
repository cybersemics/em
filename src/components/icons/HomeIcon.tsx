import React from 'react'
import { useSelector } from 'react-redux'
import State from '../../@types/State'
import theme from '../../selectors/theme'

/** A home icon. */
const HomeIcon = ({
  color,
  size,
  style,
}: {
  color?: string
  dark?: boolean
  size?: number
  style?: React.CSSProperties
}) => {
  const dark = useSelector((state: State) => theme(state) !== 'Light')
  return (
    <span role='img' aria-label='home' className='logo-wrapper'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width={size || 24}
        height={size || 24}
        viewBox='0 0 24 24'
        className='logo'
        fill={color || (dark ? '#FFF' : '#000')}
        style={style}
      >
        <path d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' />
        <path d='M0 0h24v24H0z' fill='none' />
      </svg>
    </span>
  )
}

export default HomeIcon
