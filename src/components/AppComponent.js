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
import { Tutorial } from './Tutorial.js'
import { Toolbar } from './Toolbar'
import HamburgerMenu from './HamburgerMenu.js'

// util
import {
  isTutorial,
  restoreSelection,
} from '../util.js'

export const AppComponent = connect(({ dataNonce, focus, search, user, settings, dragInProgress, isLoading, showModal, showSplitView }) => ({
  dataNonce,
  dark: settings.dark,
  dragInProgress,
  focus,
  isLoading,
  scaleSize: settings.scaleSize,
  search,
  showModal,
  tutorial: settings.tutorial,
  tutorialStep: settings.tutorialStep,
  user,
  showSplitView,
}))((
  { dataNonce, focus, search, user, dragInProgress, dark, tutorialStep, isLoading, dispatch, showModal, scaleSize, showSplitView }) => {
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
        : <React.Fragment>

          {isTutorial() && !isLoading ? <Tutorial /> : null}

          <SplitPane
            style={{ position: 'relative' }}
            className={isSplitting ? 'animating' : ''}
            split="vertical"
            defaultSize={!showSplitView ? '100%' : parseInt(localStorage.getItem('splitPos'), 10) || '50%'}
            size={!showSplitView ? '100%' : parseInt(localStorage.getItem('splitPos'), 10) || '50%'}
            onChange={size => localStorage.setItem('splitPos', size)}>
            <div className='panel-content'>
              <Toolbar />
              <Content />
            </div>
            {showSplitView
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

        </React.Fragment>
      }

    </MultiGesture>
  </div>
})
