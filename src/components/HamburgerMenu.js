import React from 'react'
import ReactHamburger from 'react-hamburger-menu'
import { useSelector, useDispatch } from 'react-redux'

// constants
import {
  NOOP,
} from '../constants.js'

const HamburgerMenu = ({ dark }) => {

  const showSidebar = useSelector(state => state.showSidebar)
  const dispatch = useDispatch()

  return (
    <div
      className='hamburger-menu'
      style={{
        padding: '20px 14px 10px 14px',
        position: 'fixed',
        cursor: 'pointer',
        // transisiton is used on z-index to only show up the hamburger menu after sidebar has properly closed.
        transition: showSidebar ? '' : 'z-index 800ms linear' ,
        top: 0,
        // z-index of the wrapper is increased used to prevent sidebar swipeWidth component blocking the click events.
        zIndex: showSidebar ? '3' : '2500',
      }}
      onClick={() => {
        dispatch({ type: 'toggleSidebar' })
      }}
    >
      <ReactHamburger
        isOpen={showSidebar}
        width={20}
        height={16}
        strokeWidth={1}
        menuClicked={NOOP} // just passing an empty arrow function as it is mandatory prop to pass
        rotate={0}
        color=' ' // passing blank, non-empty string to avoid ReactHamburger to pass deault styles to the menu UI (for applying theme)
        borderRadius={0}
        animationDuration={0.8}
      />
    </div>
  )
}

export default HamburgerMenu
