import React from 'react'
import ReactHamburger from 'react-hamburger-menu'
import { useSelector, useDispatch } from 'react-redux'
import { isMobile } from '../browser'

const HamburgerMenu = () => {

  const showSidebar = useSelector(state => state.showSidebar)
  const dispatch = useDispatch()

  return (
    <div
      className='hamburger-menu'
      style={{ padding: isMobile ? '5%' : '2% 3%' }}
      onClick={() => {
        dispatch({ type: 'toggleSidebar' })
      }}
    >
      <span style={{ cursor: 'pointer' }}>
        <ReactHamburger
          isOpen={showSidebar}
          width={20}
          height={15}
          strokeWidth={1.5}
          rotate={0}
          color=' ' // passing empty string to avoid ReactHamburger to pass deault styles to the menu UI (for applying theme)
          borderRadius={0}
          animationDuration={0.8}
        />
      </span>
    </div>
  )
}

export default HamburgerMenu
