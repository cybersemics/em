import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import _ from 'lodash'
import React, { FC, PropsWithChildren, useEffect, useLayoutEffect } from 'react'
import { useSelector } from 'react-redux'
import { WebviewBackground } from 'webview-background'
import { css } from '../../styled-system/css'
import State from '../@types/State'
import { isAndroid, isMac, isSafari, isTouch, isiPhone } from '../browser'
import { handleGestureCancel, handleGestureEnd, handleGestureSegment } from '../commands'
import { LongPressState, Settings } from '../constants'
import * as selection from '../device/selection'
import testFlags from '../e2e/testFlags'
import getUserSetting from '../selectors/getUserSetting'
import isTutorial from '../selectors/isTutorial'
import theme from '../selectors/theme'
import themeColors from '../selectors/themeColors'
import store from '../stores/app'
import isDocumentEditable from '../util/isDocumentEditable'
import Alert from './Alert'
import CommandCenter from './CommandCenter/CommandCenter'
import CommandPalette from './CommandPalette'
import Content from './Content'
import DropGutter from './DropGutter'
import ErrorMessage from './ErrorMessage'
import Footer from './Footer'
import GestureMenu from './GestureMenu'
import HamburgerMenu from './HamburgerMenu'
import LatestCommandsDiagram from './LatestCommandsDiagram'
import MultiGesture from './MultiGesture'
import NavBar from './NavBar'
import Sidebar from './Sidebar'
import Tips from './Tips/Tips'
import Toolbar from './Toolbar'
import Tutorial from './Tutorial'
import UndoSlider from './UndoSlider'
import GestureCheatsheet from './dialog/GestureCheatsheet'
import * as modals from './modals'

/** A hook that sets an attribute on the document.body element. */
const useBodyAttribute = (name: string, value: string) => {
  useLayoutEffect(() => {
    document.body.setAttribute(name, value)
  }, [name, value])
}

/** A hook that takes a Redux selector and calls useBodyAttribute to set an attribute on the body element to the value from the Redux state. */
const useBodyAttributeSelector = <T,>(name: string, selector: (state: State) => T) => {
  const value = useSelector(selector)
  useBodyAttribute(name, String(value))
}

/** A gutter that toggles the sidebar. Positioned above the NavBar so that it doesn't block NavBar or Footer clicks. */
// const SidebarGutter = () => {
//   return (
//     <div className={css({ position: 'relative' })}>
//       <div
//         {...fastClick(() => {
//           store.dispatch(toggleSidebar({}))
//         })}
//         className={css({ position: 'absolute', height: 9999, width: 30, bottom: 30, zIndex: 1 })}
//       ></div>
//     </div>
//   )
// }

/** Cancel gesture if there is an active text selection, drag, modal, or sidebar. */
const shouldCancelGesture = (
  /** The x coordinate of the touch event. If x and y are provided, cancels the gesture if the touch point is too close to the selection. See selection.isNear. */
  x?: number,
  /** The y coordinate of the touch event. If x and y are provided, cancels the gesture if the touch point is too close to the selection. See selection.isNear. */
  y?: number,
): boolean => {
  const state = store.getState()
  const distance = state.fontSize * 2
  return (
    (x && y && selection.isNear(x, y, distance)) ||
    state.longPress !== LongPressState.Inactive ||
    !!state.showModal ||
    state.showSidebar ||
    !!state.showGestureCheatsheet
  )
}

/**
 * Wrap an element in the MultiGesture component if the user has a touch screen.
 */
const MultiGestureIfTouch: FC<PropsWithChildren> = ({ children }) => {
  const leftHanded = useSelector(getUserSetting(Settings.leftHanded))
  return isTouch ? (
    <MultiGesture
      leftHanded={leftHanded}
      onGesture={handleGestureSegment}
      onEnd={handleGestureEnd}
      shouldCancelGesture={shouldCancelGesture}
      onCancel={handleGestureCancel}
    >
      {children}
    </MultiGesture>
  ) : (
    <>{children}</>
  )
}

/**
 * The main app component.
 */
const AppComponent: FC = () => {
  const colors = useSelector(themeColors)
  const dark = useSelector(state => theme(state) !== 'Light')
  const enableLatestCommandsDiagram = useSelector(state => state.enableLatestCommandsDiagram)
  const showTutorial = useSelector(state => isTutorial(state) && !state.isLoading)
  const fontSize = useSelector(state => state.fontSize)
  const showModal = useSelector(state => state.showModal)
  const tutorial = useSelector(isTutorial)

  useEffect(() => {
    WebviewBackground.changeBackgroundColor({ color: colors.bg })
    document.documentElement.style.backgroundColor = colors.bg
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.bg)
  }, [colors.bg])

  // sync root font size with app font size so rem units follow the user setting
  useLayoutEffect(() => {
    if (typeof document === 'undefined') return

    document.documentElement.style.fontSize = `${fontSize}px`
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`)
  }, [fontSize])

  // Set body attributes using custom hooks
  useBodyAttribute('data-device', isTouch ? 'mobile' : 'desktop')
  useBodyAttribute('data-native', Capacitor.isNativePlatform() ? 'true' : 'false')
  useBodyAttribute('data-platform', isAndroid ? 'android' : isMac ? 'mac' : isiPhone ? 'iphone' : 'other')
  useBodyAttribute('data-browser', /Chrome/.test(navigator.userAgent) ? 'chrome' : isSafari() ? 'safari' : 'other')
  useBodyAttributeSelector('data-color-mode', state => (theme(state) !== 'Light' ? 'dark' : 'light'))
  useBodyAttributeSelector('data-drag-in-progress', state => state.longPress === LongPressState.DragInProgress)
  useBodyAttributeSelector('data-drag-hold', state => state.longPress === LongPressState.DragHold)

  // Handle other non-attribute logic
  useLayoutEffect(() => {
    if (testFlags.simulateDrag) {
      document.body.classList.add('debug-simulate-drag')
    }
    if (testFlags.simulateDrop) {
      document.body.classList.add('debug-simulate-drop')
    }

    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
      // Android only, set statusbar color to black.
      if (Capacitor.getPlatform() === 'android') {
        StatusBar.setBackgroundColor({
          color: colors.bg,
        })
      }
    }
  }, [colors, dark])

  if (showModal && !modals[showModal]) {
    throw new Error(`Missing component for Modal type: ${showModal}`)
  }

  const Modal = showModal ? modals[showModal] : null

  return (
    <div
      className={css({
        /* safeAreaTop applies for rounded screens */
        paddingTop: 'safeAreaTop',
      })}
    >
      <Alert />
      <Tips />
      {!isTouch && <CommandPalette />}
      {isTouch && <GestureMenu />}
      <ErrorMessage />
      {enableLatestCommandsDiagram && <LatestCommandsDiagram position='bottom' />}
      <GestureCheatsheet />

      {isDocumentEditable() && !tutorial && !showModal && (
        <>
          <Sidebar />
          <HamburgerMenu />
        </>
      )}
      {!showModal && !tutorial && (
        <>
          <Toolbar />
          <UndoSlider />
        </>
      )}
      <DropGutter />

      <MultiGestureIfTouch>
        {showModal ? (
          <div style={{ fontSize }}>{Modal && <Modal />}</div>
        ) : (
          <>
            {showTutorial ? <Tutorial /> : null}
            {
              // overflow: hidden is needed to prevent the content from briefly scrolling horizontally during a gesture.
              <div className={css({ position: 'relative', overflow: 'hidden' })} style={{ fontSize }}>
                <Content />
              </div>
            }
          </>
        )}
      </MultiGestureIfTouch>

      {!showModal && isDocumentEditable() && (
        <>
          {/* NavBar must be outside MultiGestureIfTouch in order to have a higher stacking order than the Sidebar. Otherwise the user can accidentally activate the Sidebar edge swipe when trying to tap the Home icon. */}
          <NavBar position='bottom' />

          <CommandCenter />
          <div style={{ fontSize }}>
            <Footer />
          </div>
        </>
      )}
    </div>
  )
}

const AppComponentMemo = React.memo(AppComponent)
AppComponentMemo.displayName = 'AppComponent'

export default AppComponentMemo
