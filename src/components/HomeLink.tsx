import React from 'react'
import { useDispatch } from 'react-redux'
import home from '../action-creators/home'
import HomeIcon from './icons/HomeIcon'

interface HomeLinkProps {
  color?: string
  size?: number
  style?: React.CSSProperties
}

/** A link to the home screen. */
const HomeLink = ({ color, size, style }: HomeLinkProps) => {
  const dispatch = useDispatch()
  return (
    <span className='home'>
      <a
        tabIndex={-1}
        /* TODO: Add setting to enable tabIndex for accessibility */ href='/'
        onClick={e => {
          e.preventDefault()
          dispatch(home())
        }}
      >
        <HomeIcon fill={color} size={size} style={style} />
      </a>
    </span>
  )
}

export default HomeLink
