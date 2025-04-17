import React from 'react'
import { useDispatch } from 'react-redux'
import { css } from '../../styled-system/css'
import { extendTapRecipe } from '../../styled-system/recipes'
import { homeActionCreator as home } from '../actions/home'
import haptics from '../util/haptics'
import HomeIcon from './icons/HomeIcon'

interface HomeLinkProps {
  color?: string
  size?: number
  iconStyle?: React.CSSProperties
  className?: string
  breadcrumb?: boolean
}

/** A link to the home screen. */
const HomeLink = ({ color, size, iconStyle, className, breadcrumb }: HomeLinkProps) => {
  const dispatch = useDispatch()
  return (
    <span data-testid='home' className={className}>
      <a
        tabIndex={-1}
        href='/'
        onClick={e => {
          e.preventDefault()
          dispatch(home())
        }}
        onTouchEnd={haptics.light}
        role='button'
      >
        <HomeIcon
          className={extendTapRecipe()}
          fill={color}
          size={size}
          style={iconStyle}
          wrapperClassName={css({
            display: 'flex',
            alignItems: 'center',
            ...(breadcrumb && { display: 'inline', position: 'relative', top: '3px' }),
          })}
        />
      </a>
    </span>
  )
}

export default HomeLink
