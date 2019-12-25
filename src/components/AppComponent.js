import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
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

export const AppComponent = connect(({ dataNonce, focus, search, user, settings, dragInProgress, isLoading, showModal }) => ({
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
}))((
  { dataNonce, focus, search, user, dragInProgress, dark, tutorialStep, isLoading, dispatch, showModal, scaleSize }) => {

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
      <Toolbar />

      {showModal

        // modals
        ? <React.Fragment>
          <ModalWelcome />
          <ModalHelp />
        </React.Fragment>

        // navigation, content, and footer
        : <React.Fragment>

          { // render as header on desktop
            !isMobile ? <NavBar position='top' /> : null}

          {isTutorial() && !isLoading ? <Tutorial /> : null}

          <Content />

          { // render as footer on mobile
            isMobile ? <NavBar position='bottom' /> : null}

          <Footer />

        </React.Fragment>
      }

    </MultiGesture></div>
})
