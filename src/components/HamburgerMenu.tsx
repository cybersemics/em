import React from 'react'
import ReactHamburger from 'react-hamburger-menu'
import { useDispatch, useSelector } from 'react-redux'
import { noop } from 'lodash'
import { getFontSize, isTutorial } from '../selectors'
import { toggleSidebar } from '../action-creators'
import { State } from '../util/initialState'
import { CSSTransition } from 'react-transition-group'

const tutorialLocal = localStorage['Settings/Tutorial'] !== 'Off'

/** An options menu with three little bars that looks like a hamburger. */
const HamburgerMenu = () => {

  const isLoading = useSelector((state: State) => state.isLoading)
  const showModal = useSelector((state: State) => state.showModal)
  const tutorialSettings = useSelector(isTutorial)
  const error = useSelector((state: State) => state.error)
  const tutorial = isLoading ? tutorialLocal : tutorialSettings
  const showSidebar = useSelector((state: State) => state.showSidebar)
  const showTopControls = useSelector((state: State) => state.showTopControls)
  const dispatch = useDispatch()
  const fontSize = useSelector<State, number>(getFontSize)

  const width = fontSize * 1.3
  const paddingTop = 15 + fontSize * 0.1

  return (
    <CSSTransition in={showTopControls} timeout={600} classNames='fade-600' unmountOnExit>
      <div
        className='hamburger-menu'
        style={{
          padding: `${paddingTop}px 15px 10px 15px`,
          position: 'fixed',
          cursor: 'pointer',
          // transisiton is used on z-index to only show up the hamburger menu after sidebar has properly closed.
          transition: showSidebar || tutorial || error || showModal ? '' : 'z-index 800ms linear',
          top: 0,
          // z-index of the wrapper is increased used to prevent sidebar swipeWidth component blocking the click events.
          zIndex: showSidebar || tutorial || error || showModal ? -1 : 10,
        }}
        onClick={() => {
          dispatch(toggleSidebar())
        }}
      >
        <ReactHamburger
          isOpen={showSidebar}
          width={width}
          height={width * 0.7}
          strokeWidth={fontSize / 20}
          menuClicked={noop} // just passing an empty arrow function as it is mandatory prop to pass
          rotate={0}
          color=' ' // passing blank, non-empty string to avoid ReactHamburger to pass deault styles to the menu UI (for applying theme)
          borderRadius={0}
          animationDuration={0.8}
        />
      </div>
    </CSSTransition>
  )
}

export default HamburgerMenu
