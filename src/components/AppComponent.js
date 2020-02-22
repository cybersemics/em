import React, { useState } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import SplitPane from 'react-split-pane'
import { isMobile, isAndroid } from '../browser.js'
import { store } from '../store.js'
import globals from '../globals.js'
import { handleGestureSegment, handleGestureEnd } from '../shortcuts.js'

// components
import { Alert } from './Alert.js'
import { Content } from './Content.js'
import Sidebar from './Sidebar.js'
import { ErrorMessage } from './ErrorMessage.js'
import { Footer } from './Footer.js'
import { ModalHelp } from './ModalHelp.js'
import { ModalWelcome } from './ModalWelcome.js'
import { MultiGesture } from './MultiGesture.js'
import { ModalExport } from './ModalExport'
import { NavBar } from './NavBar.js'
import { Status } from './Status.js'
import { Scale } from './Scale.js'
import { Tutorial } from './Tutorial.js'
import { Toolbar } from './Toolbar'
import HamburgerMenu from './HamburgerMenu.js'

// constants
import {
  EM_TOKEN,
} from '../constants.js'

// util
import {
  getSetting,
  isTutorial,
  meta,
  restoreSelection,
} from '../util.js'

const darkLocal = localStorage['Settings/Theme'] || 'Dark'
const fontSizeLocal = +(localStorage['Settings/Font Size'] || 16)
const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'
const tutorialStepLocal = +(localStorage['Settings/Tutorial Step'] || 1)

export const AppComponent = connect(({ dataNonce, focus, search, user, settings, dragInProgress, isLoading, showModal, showSplitView }) => {
  const dark = (isLoading ? darkLocal : getSetting('Theme')[0]) !== 'Light'
  const scale = (isLoading ? fontSizeLocal : getSetting('Font Size')[0] || 16) / 16
  const tutorial = isLoading ? tutorialLocal : meta([EM_TOKEN, 'Settings', 'Tutorial']).On
  const tutorialStep = isLoading ? tutorialStepLocal : getSetting('Tutorial Step')[0] || 1
  return {
    dark,
    dataNonce,
    dragInProgress,
    focus,
    isLoading,
    scale,
    search,
    showModal,
    showSplitView,
    tutorial,
    tutorialStep,
    user
  }
})((
  { dark, dataNonce, focus, search, user, dragInProgress, tutorialStep, isLoading, dispatch, showModal, scale, showSplitView }) => {

  const [prevShowSplitView, setPrevShowSplitView] = useState(null)
  const [isSplitting, setIsSplitting] = useState(false)
  if (showSplitView !== prevShowSplitView) {
    // Row changed since last render. Update isScrollingDown.
    setPrevShowSplitView(showSplitView)
    setIsSplitting(true)
    setTimeout(() => {
      setIsSplitting(false)
    }, 400)
  }

  return <div ref={() => {

    document.body.classList[dark ? 'add' : 'remove']('dark')

    // set selection on desktop on load
    const { cursor } = store.getState()
    if (!isMobile && cursor && !window.getSelection().focusNode) {
      restoreSelection(cursor)
    }

    if (!globals.rendered) {
      globals.rendered = true
    }

  }} className={classNames({
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
        : <div>

          {isTutorial() && !isLoading ? <Tutorial /> : null}

          <SplitPane
            style={{ position: 'relative' }}
            className={isSplitting ? 'animating' : ''}
            split="vertical"
            defaultSize={!showSplitView ? '100%' : parseInt(localStorage.getItem('splitPos'), 10) || '50%'}
            size={!showSplitView ? '100%' : parseInt(localStorage.getItem('splitPos'), 10) || '50%'}
            onChange={size => localStorage.setItem('splitPos', size)}>

            <Scale amount={scale}>
              <Content />
              <Toolbar />
            </Scale>

            {showSplitView
              ? <Scale amount={scale}>
                <Content />
                <Toolbar />
              </Scale>
              // children required by SplitPane
              : <div />
            }
          </SplitPane>

          <Scale amount={scale}>
            <NavBar position='bottom' />
            <Footer />
          </Scale>

        </div>
      }

    </MultiGesture>
  </div>
})
