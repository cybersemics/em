import React from 'react'
import ReactHamburger from 'react-hamburger-menu'
import { connect, useSelector, useDispatch } from 'react-redux'
import { isMobile } from '../browser'

import {
  getSetting,
} from '../util.js'

const HamburgerMenu = ({ dark }) => {

  const showSidebar = useSelector(state => state.showSidebar)
  const dispatch = useDispatch()

  return (
    <div
      className='hamburger-menu'
      style={{ margin: isMobile ? '5% 6%' : '2% 3%', cursor: 'pointer', zIndex: showSidebar ? '3' : '2500', transition: showSidebar ? '' : 'z-index 800ms linear' }}
      onClick={() => {
        dispatch({ type: 'toggleSidebar' })
      }}
    >
      {/* z-index of the wrapper is increased used to prevent sidebar swipeWidth component blocking the click events.
          transisiton is used on z-index to only show up the hamburger menu after sidebar has properly closed.
      */}
      <ReactHamburger
        isOpen={showSidebar}
        width={20}
        height={16}
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

export default connect(() => ({ dark: getSetting('Theme')[0] !== 'Light' }))(HamburgerMenu)
