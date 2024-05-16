import React from 'react'
import { useDispatch } from 'react-redux'
import { homeActionCreator as home } from '../actions/home'
import fastClick from '../util/fastClick'
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
        href='/'
        onClick={e => e.preventDefault()}
        {...fastClick(() => {
          dispatch(home())
        })}
      >
        <HomeIcon className='extend-tap' fill={color} size={size} style={style} />
      </a>
    </span>
  )
}

export default HomeLink
