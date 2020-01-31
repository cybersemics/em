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
      style={{ margin: isMobile ? '5%' : '2% 3%', cursor: 'pointer' }}
      onClick={() => {
        dispatch({ type: 'toggleSidebar' })
      }}
    >
      <ReactHamburger
        isOpen={showSidebar}
        width={23}
        height={18}
        strokeWidth={1.5}
        menuClicked={() => { }} // just passing an empty arrow function as it is mandatory prop to pass
        rotate={0}
        color=' ' // passing empty string to avoid ReactHamburger to pass deault styles to the menu UI (for applying theme)
        borderRadius={0}
        animationDuration={0.8}
      />
    </div>
  )
}

export default HamburgerMenu
