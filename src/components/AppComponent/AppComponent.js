import React, { useState, useEffect } from 'react'
import classNames from 'classnames'
import SplitPane from 'react-split-pane'
import { isMobile, isAndroid } from '../../browser'
import { store } from '../../store'
import globals from '../../globals'
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
} from '../../util'

export const AppComponent = (
  { dark, dragInProgress, isLoading, showModal, scaleSize, showSplitView }) => {

  const [splitView, updateSplitView] = useState(showSplitView)
  const [isSplitting, updateIsSplitting] = useState(false)

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
            defaultSize={!splitView ? '100%' : parseInt(localStorage.getItem('splitPos'), 10) || '50%'}
            size={!splitView ? '100%' : parseInt(localStorage.getItem('splitPos'), 10) || '50%'}
            onChange={size => localStorage.setItem('splitPos', size)}>
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
