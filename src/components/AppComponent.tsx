import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import _ from 'lodash'
import React, { FC, PropsWithChildren, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import SplitPane from 'react-split-pane'
import { WebviewBackground } from 'webview-background'
import { css } from '../../styled-system/css'
import { updateSplitPositionActionCreator as updateSplitPosition } from '../actions/updateSplitPosition'
import { isAndroid, isMac, isSafari, isTouch, isiPhone } from '../browser'
import { inputHandlers } from '../commands'
import { Settings } from '../constants'
import * as selection from '../device/selection'
import testFlags from '../e2e/testFlags'
import globals from '../globals'
import getUserSetting from '../selectors/getUserSetting'
import isTutorial from '../selectors/isTutorial'
import theme from '../selectors/theme'
import themeColors from '../selectors/themeColors'
import store from '../stores/app'
import isDocumentEditable from '../util/isDocumentEditable'
import Alert from './Alert'
import CommandPalette from './CommandPalette'
import Content from './Content'
import ErrorMessage from './ErrorMessage'
import Footer from './Footer'
import HamburgerMenu from './HamburgerMenu'
import LatestCommandsDiagram from './LatestCommandsDiagram'
import MultiGesture from './MultiGesture'
import NavBar from './NavBar'
import QuickDropPanel from './QuickDropPanel'
import Sidebar from './Sidebar'
import Tips from './Tips/Tips'
import Toolbar from './Toolbar'
import Tutorial from './Tutorial'
import * as modals from './modals'

// This can be removed once Split Pane is working.
const DISABLE_SPLIT_PANE = true

const SPLIT_ANIMATION_DURATION = 400
const SPLIT_RESIZE_THROTTLE = 8

const { handleGestureCancel, handleGestureEnd, handleGestureSegment } = inputHandlers(store)

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

/** Disables long-press-to-select by clearing any selections that appear during long press. */
const useDisableLongPressToSelect = () => {
  const onSelectionChange = useCallback(() => {
    // when isCollapsed is false, there is a selection with at least one character
    // long-press-to-select only selects one or more characters
    if (globals.longpressing && selection.isActive() && !selection.isCollapsed()) {
      selection.clear()
    }
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [onSelectionChange])
}

/** Cancel gesture if there is an active text selection, drag, modal, or sidebar. */
const shouldCancelGesture = (
  /** The x coordinate of the touch event. If x and y are provided, cancels the gesture if the touch point is too close to the selection. See selection.isNear. */
  x?: number,
  /** The y coordinate of the touch event. If x and y are provided, cancels the gesture if the touch point is too close to the selection. See selection.isNear. */
  y?: number,
): boolean => {
  const state = store.getState()
  const distance = state.fontSize * 2
  return (x && y && selection.isNear(x, y, distance)) || state.dragInProgress || !!state.showModal || state.showSidebar
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
  const dispatch = useDispatch()
  const lastSplitViewRef = useRef(false)
  const [isSplitting, setIsSplitting] = useState(false)

  const colors = useSelector(themeColors)
  const dark = useSelector(state => theme(state) !== 'Light')
  const dragInProgress = useSelector(state => state.dragInProgress)
  const enableLatestCommandsDiagram = useSelector(state => state.enableLatestCommandsDiagram)
  const showTutorial = useSelector(state => isTutorial(state) && !state.isLoading)
  const fontSize = useSelector(state => state.fontSize)
  const showSplitView = useSelector(state => state.showSplitView)
  const showModal = useSelector(state => state.showModal)
  const tutorial = useSelector(isTutorial)
  const splitPosition = useSelector(state => state.splitPosition)

  WebviewBackground.changeBackgroundColor({ color: colors.bg })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onSplitResize = useCallback(
    _.throttle((n: number) => dispatch(updateSplitPosition(n)), SPLIT_RESIZE_THROTTLE),
    [],
  )

  useDisableLongPressToSelect()

  useLayoutEffect(() => {
    document.body.setAttribute('data-color-mode', dark ? 'dark' : 'light')
    document.body.setAttribute('data-device', isTouch ? 'mobile' : 'desktop')
    document.body.setAttribute('data-native', Capacitor.isNativePlatform() ? 'true' : 'false')
    document.body.setAttribute('data-platform', isAndroid ? 'android' : isMac ? 'mac' : isiPhone ? 'iphone' : 'other')
    document.body.setAttribute('data-drag-in-progress', dragInProgress.toString())

    document.body.setAttribute(
      'data-browser',
      /Chrome/.test(navigator.userAgent) ? 'chrome' : isSafari() ? 'safari' : 'other',
    )
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
  }, [colors, dark, dragInProgress])

  useEffect(() => {
    let splitAnimationTimer: number
    if (showSplitView !== lastSplitViewRef.current) {
      lastSplitViewRef.current = !!showSplitView
      setIsSplitting(true)
      splitAnimationTimer = setTimeout(() => {
        setIsSplitting(false)
      }, SPLIT_ANIMATION_DURATION) as unknown as number
    }

    return () => {
      clearTimeout(splitAnimationTimer)
    }
  }, [showSplitView])

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
      <CommandPalette />
      <ErrorMessage />
      {enableLatestCommandsDiagram && <LatestCommandsDiagram position='bottom' />}
      {isDocumentEditable() && !tutorial && !showModal && (
        <>
          <Sidebar />
          <HamburgerMenu />
        </>
      )}
      {!showModal && !tutorial && <Toolbar />}
      <QuickDropPanel />

      <MultiGestureIfTouch>
        {showModal ? (
          <div style={{ fontSize }}>{Modal && <Modal />}</div>
        ) : (
          <>
            {showTutorial ? <Tutorial /> : null}
            {DISABLE_SPLIT_PANE ? (
              // overflow: hidden is needed to prevent the content from briefly scrolling horizontally during a gesture.
              <div className={css({ position: 'relative', overflow: 'hidden' })} style={{ fontSize }}>
                <Content />
              </div>
            ) : (
              <SplitPane
                paneClassName={css({ transition: isSplitting ? 'width 0.2s ease' : undefined, userSelect: 'none' })}
                resizerClassName={css({
                  background: 'fg',
                  opacity: 0.2,
                  zIndex: 'resizer',
                  boxSizing: 'border-box',
                  backgroundClip: 'padding-box',
                  userSelect: 'none',
                  '&:hover': {
                    transition: 'all {durations.fast} ease-out',
                  },
                  '&.horizontal': {
                    height: '11px',
                    margin: '-5px 0',
                    borderTop: '5px solid {colors.fgTransparent}',
                    borderBottom: '5px solid {colors.fgTransparent}',
                    cursor: 'row-resize',
                    width: '100%',
                  },
                  '&.horizontal:hover': {
                    borderTop: '5px solid {colors.bgOverlay50}',
                    borderBottom: '5px solid {colors.bgOverlay50}',
                  },
                  '&.vertical': {
                    width: '11px',
                    margin: '0 -5px',
                    borderLeft: '5px solid {colors.fgTransparent}',
                    borderRight: '5px solid {colors.fgTransparent}',
                    cursor: 'col-resize',
                  },
                  '&.vertical:hover': {
                    borderLeft: '5px solid {colors.fgOverlay50}',
                    borderRight: '5px solid {colors.fgOverlay50}',
                  },
                  '&.disabled': { cursor: 'not-allowed' },
                  '&.disabled:hover': { borderColor: 'transparent' },
                })}
                className={css({
                  position: 'relative', // not applied due to `position: absolute` in style prop of react-split-pane
                  userSelect: 'none',
                })}
                defaultSize={!showSplitView ? '100%' : splitPosition || '50%'}
                onChange={onSplitResize}
                size={!showSplitView ? '100%' : splitPosition || '50%'}
                split='vertical'
                style={{ fontSize }}
              >
                <Content />
                {showSplitView ? (
                  <Content />
                ) : (
                  // children required by SplitPane
                  <></>
                )}
              </SplitPane>
            )}
          </>
        )}
      </MultiGestureIfTouch>

      {!showModal && isDocumentEditable() && (
        <>
          {/* NavBar must be outside MultiGestureIfTouch in order to have a higher stacking order than the Sidebar. Otherwise the user can accidentally activate the Sidebar edge swipe when trying to tap the Home icon. */}
          <NavBar position='bottom' />
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
