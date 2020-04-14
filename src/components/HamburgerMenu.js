import React from 'react'
import ReactHamburger from 'react-hamburger-menu'
import { useDispatch, useSelector } from 'react-redux'

// constants
import {
  NOOP,
} from '../constants'

// util
import {
  isTutorial,
} from '../util'

const tutorialLocal = localStorage['Settings/Tutorial'] !== 'Off'

const HamburgerMenu = ({ dark }) => {

  const isLoading = useSelector(state => state.isLoading)
  const tutorialSettings = useSelector(isTutorial)
  const error = useSelector(state => state.error)
  const tutorial = isLoading ? tutorialLocal : tutorialSettings
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
        transition: showSidebar || tutorial || error ? '' : 'z-index 800ms linear',
        top: 0,
        // z-index of the wrapper is increased used to prevent sidebar swipeWidth component blocking the click events.
        zIndex: showSidebar || tutorial || error ? '-1' : '10',
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
