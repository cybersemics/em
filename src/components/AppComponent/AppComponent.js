import React, { useState, useEffect, useLayoutEffect } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import SplitPane from 'react-split-pane'
import { isMobile, isAndroid } from '../../browser'
import { store } from '../../store'
import { handleGestureSegment, handleGestureEnd } from '../../shortcuts'

// components
import { Alert } from '../Alert'
import { Content } from '../Content'
import Sidebar from '../Sidebar'
import { ErrorMessage } from '../ErrorMessage'
import { Footer } from '../Footer'
import { ModalHelp } from '../ModalHelp'
import { ModalWelcome } from '../ModalWelcome'
import { MultiGesture } from '../MultiGesture'
import { ModalExport } from '../ModalExport'
import { NavBar } from '../NavBar'
import { Status } from '../Status'
import { Tutorial } from '../Tutorial'
import { Toolbar } from '../Toolbar'
import HamburgerMenu from '../HamburgerMenu'

// util
import {
  isTutorial,
  restoreSelection,
  getSetting,
  meta,
} from '../../util'

import {
  EM_TOKEN,
} from '../../constants'

import { updateSplitPosition } from '../../action-creators/splitView'

const darkLocal = localStorage['Settings/Theme'] || 'Dark'
const fontSizeLocal = +(localStorage['Settings/Font Size'] || 16)
const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'
const tutorialStepLocal = +(localStorage['Settings/Tutorial Step'] || 1)

const mapStateToProps = state => {
  const { dataNonce, focus, search, user, dragInProgress, isLoading, showModal, splitPosition, showSplitView } = state
  const dark = (isLoading ? darkLocal : getSetting('Theme')[0]) !== 'Light'
  const scaleSize = (isLoading ? fontSizeLocal : getSetting('Font Size')[0] || 16) / 16
  const tutorial = isLoading ? tutorialLocal : meta([EM_TOKEN, 'Settings', 'Tutorial']).On
  const tutorialStep = isLoading ? tutorialStepLocal : getSetting('Tutorial Step')[0] || 1
  return {
    dark,
    dataNonce,
    dragInProgress,
    focus,
    isLoading,
    scaleSize,
    search,
    showModal,
    splitPosition,
    showSplitView,
    tutorial,
    tutorialStep,
    user,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    updateSplitPos: splitPos => dispatch(updateSplitPosition(splitPos)),
  }
}

const AppComponent = (
  { dark, dragInProgress, isLoading, showModal, scaleSize, showSplitView, splitPosition, updateSplitPos }) => {

  const [splitView, updateSplitView] = useState(showSplitView)
  const [isSplitting, updateIsSplitting] = useState(false)

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

      {showModal

        // modals
        ? <React.Fragment>
          <ModalWelcome />
          <ModalHelp />
          <ModalExport />
        </React.Fragment>

        // navigation, content, and footer
        : <div style={{
          transform: `scale(${scaleSize})`,
          transformOrigin: '0 0',
          width: `${100 * (1 / scaleSize)}%`
        }}>

          {isTutorial() && !isLoading ? <Tutorial /> : null}

          <SplitPane
            style={{ position: 'relative' }}
            className={isSplitting ? 'animating' : ''}
            split="vertical"
            defaultSize={!splitView ? '100%' : splitPosition || '50%'}
            size={!splitView ? '100%' : splitPosition || '50%'}
            onDragFinished={updateSplitPos}
          >
            <div className='panel-content'>
              <Toolbar />
              <Content />
            </div>
            {splitView
              ? <div className='panel-content'>
                <Toolbar />
                <Content />
              </div>
              // children required by SplitPane
              : <div />
            }
          </SplitPane>
          { // render as footer on mobile and desktop
            <NavBar position='bottom' />}

          <Footer />

        </div>
      }

    </MultiGesture>
  </div>
}

export const AppComponentContainer = connect(mapStateToProps, mapDispatchToProps)(AppComponent)
