import React, { useState, useEffect, useLayoutEffect } from 'react'
import { connect, useSelector } from 'react-redux'
import classNames from 'classnames'
import SplitPane from 'react-split-pane'
import { isMobile, isAndroid } from '../browser'
import { store } from '../store'
import { handleGestureSegment, handleGestureEnd } from '../shortcuts'

// components
import { Alert } from './Alert'
import Content from './Content'
import Sidebar from './Sidebar'
import { ErrorMessage } from './ErrorMessage'
import { Footer } from './Footer'
import { ModalHelp } from './ModalHelp'
import { ModalWelcome } from './ModalWelcome'
import { MultiGesture } from './MultiGesture'
import { ModalExport } from './ModalExport'
import { NavBar } from './NavBar'
import { Status } from './Status'
import { Scale } from './Scale'
import { Tutorial } from './Tutorial'
import { Toolbar } from './Toolbar'
import HamburgerMenu from './HamburgerMenu'

// util
import {
  isTutorial,
  restoreSelection,
  getSetting,
} from '../util'

import { updateSplitPosition } from '../action-creators/updateSplitPosition'

const darkLocal = localStorage['Settings/Theme'] || 'Dark'
const fontSizeLocal = +(localStorage['Settings/Font Size'] || 16)
const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'

const mapStateToProps = ({ dataNonce, focus, search, user, dragInProgress, isLoading, showModal, splitPosition, showSplitView }) => {
  const dark = (isLoading ? darkLocal : getSetting('Theme')[0]) !== 'Light'
  const scale = (isLoading ? fontSizeLocal : getSetting('Font Size')[0] || 16) / 16
  return {
    dark,
    dataNonce,
    dragInProgress,
    focus,
    isLoading,
    scale,
    search,
    showModal,
    splitPosition,
    showSplitView,
    user,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    updateSplitPos: splitPos => dispatch(updateSplitPosition(splitPos)),
  }
}

const AppComponent = (
  { dark, dragInProgress, isLoading, showModal, scale, showSplitView, splitPosition, updateSplitPos }) => {

  const [splitView, updateSplitView] = useState(showSplitView)
  const [isSplitting, updateIsSplitting] = useState(false)

  const tutorialSettings = useSelector(isTutorial)
  const tutorial = isLoading ? tutorialLocal : tutorialSettings

  useLayoutEffect(() => {
    document.body.classList[dark ? 'add' : 'remove']('dark')
  }, [dark])

  useEffect(() => {
    const { cursor } = store.getState()
    if (!isMobile && cursor && !window.getSelection().focusNode) {
      restoreSelection(cursor)
    }
  }, [])

  useEffect(() => {
    updateSplitView(showSplitView)
    updateIsSplitting(true)
    const splitAnimationTimer = setTimeout(() => {
      updateIsSplitting(false)
    }, 400)
    return () => {
      clearTimeout(splitAnimationTimer)
    }
  }, [showSplitView])

  return <div className={classNames({
    container: true,
    // mobile safari must be detected because empty and full bullet points in Helvetica Neue have different margins
    mobile: isMobile,
    android: isAndroid,
    'drag-in-progress': dragInProgress,
    chrome: /Chrome/.test(navigator.userAgent),
    safari: /Safari/.test(navigator.userAgent)
  })}>
    <Sidebar />
    <HamburgerMenu />
    <MultiGesture onGesture={handleGestureSegment} onEnd={handleGestureEnd}>

      <Alert />
      <ErrorMessage />
      <Status />
      <Toolbar />

      {showModal

        // modals
        ? <React.Fragment>
          <ModalWelcome />
          <ModalHelp />
          <ModalExport />
        </React.Fragment>

        // navigation, content, and footer
        : <React.Fragment>

          {tutorial && !isLoading ? <Tutorial /> : null}
          <SplitPane
            style={{ position: 'relative' }}
            className={isSplitting ? 'animating' : ''}
            split="vertical"
            defaultSize={!splitView ? '100%' : splitPosition || '50%'}
            size={!splitView ? '100%' : splitPosition || '50%'}
            onDragFinished={updateSplitPos}
          >
            <Scale amount={scale}>
              <Content />
            </Scale>

            {showSplitView
              ? <Scale amount={scale}>
                <Content />
              </Scale>
              // children required by SplitPane
              : <div />
            }
          </SplitPane>

          <NavBar position='bottom' />

          <div className="footer-wrapper">
            {/* <Scale amount={scale}> */}
            <Footer />
            {/* </Scale> */}
          </div>

        </React.Fragment>
      }

    </MultiGesture>
  </div>
}

export const AppComponentContainer = connect(mapStateToProps, mapDispatchToProps)(AppComponent)
