import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import classNames from 'classnames'
import _ from 'lodash'
import React, { FC, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { connect, useDispatch, useSelector } from 'react-redux'
import SplitPane from 'react-split-pane'
import Index from '../@types/IndexType'
import Modal from '../@types/Modal'
import State from '../@types/State'
import updateSplitPosition from '../action-creators/updateSplitPosition'
import { isAndroid, isSafari, isTouch } from '../browser'
import { BASE_FONT_SIZE } from '../constants'
import * as selection from '../device/selection'
import globals from '../globals'
import isTutorial from '../selectors/isTutorial'
import theme from '../selectors/theme'
import themeColors from '../selectors/themeColors'
import { inputHandlers } from '../shortcuts'
import store from '../stores/app'
import isDocumentEditable from '../util/isDocumentEditable'
import Alert from './Alert'
import ContentFallback from './ContentFallback'
import ErrorMessage from './ErrorMessage'
import Footer from './Footer'
import HamburgerMenu from './HamburgerMenu'
import LatestShortcutsDiagram from './LatestShortcutsDiagram'
import MultiGesture from './MultiGesture'
import NavBar from './NavBar'
import QuickDropPanel from './QuickDropPanel'
import Scale from './Scale'
import Sidebar from './Sidebar'
import Toolbar from './Toolbar'
import Tutorial from './Tutorial'
import * as modals from './modals'

// This can be removed once Split Pane is working.
const DISABLE_SPLIT_PANE = true

const Content = React.lazy(() => import('./Content'))

const { handleGestureCancel, handleGestureEnd, handleGestureSegment } = inputHandlers(store)

interface StateProps {
  dark?: boolean
  dragInProgress?: boolean
  isLoading?: boolean
  showModal?: Modal | null
  scale?: number
  showSplitView?: boolean
  splitPosition?: number
  fontSize: number
  enableLatestShortcutsDiagram: boolean
  isUserLoading?: boolean
}

/** A gutter that toggles the sidebar. Positioned above the NavBar so that it doesn't block NavBar or Footer clicks. */
// const SidebarGutter = () => {
//   return (
//     <div style={{ position: 'relative' }}>
//       <div
//         onClick={() => {
//           store.dispatch(toggleSidebar({}))
//         }}
//         style={{ position: 'absolute', height: 9999, width: 30, bottom: 30, zIndex: 1 }}
//       ></div>
//     </div>
//   )
// }

/** Converts React.CSSProperties to CSS by injecting a <style> element. Returns the style content on the css callback. */
const StyleInjector = ({
  css,
  selector,
  style,
}: {
  css: (stylesheet: string) => void
  selector: string
  style: React.CSSProperties
}) => {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const styleContent = ref.current.getAttribute('style') || ''
    ref.current.remove()
    const ruleset = `${selector}{${styleContent}}`
    css(ruleset)
  }, [])
  return <span ref={ref} style={style} />
}

/** Injects styles into a <style> element that affects all elements in the document. */
const GlobalStyles = React.memo(({ styles }: { styles: [string, React.CSSProperties][] }) => {
  const [globalStyle, setGlobalStyle] = useState<Index<string>>({})
  const appendGlobalStyle = useCallback(
    i => (css: string) => setGlobalStyle(globalStyle => ({ ...globalStyle, [i]: css })),
    [],
  )
  return (
    <>
      {styles.map(([selector, style], i) => (
        <StyleInjector key={i} css={appendGlobalStyle(i)} selector={selector} style={style} />
      ))}
      <style>{Object.values(globalStyle).join('')}</style>
    </>
  )
})
GlobalStyles.displayName = 'GlobalStyles'

/** Disables long-press-to-select by clearing any selections that appear during long press. */
const useDisableLongPressToSelect = () => {
  const onSelectionChange = useCallback(() => {
    const sel = window.getSelection()
    // when isCollapsed is false, there is a selection with at least one character
    // long-press-to-select only selects one or more characters
    if (globals.longpressing && sel && !sel.isCollapsed) {
      selection.clear()
    }
  }, [])

  useEffect(() => {
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [])
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State): StateProps => {
  const { dragInProgress, isLoading, showModal, splitPosition, showSplitView, enableLatestShortcutsDiagram } = state
  const dark = theme(state) !== 'Light'
  const scale = state.fontSize / BASE_FONT_SIZE
  return {
    dark,
    dragInProgress,
    isLoading,
    scale,
    showModal,
    splitPosition,
    showSplitView,
    fontSize: state.fontSize,
    enableLatestShortcutsDiagram,
  }
}

type Props = StateProps

/** Cancel gesture if there is an active text selection or active drag. */
const shouldCancelGesture = () => (selection.isActive() && !selection.isCollapsed()) || store.getState().dragInProgress

/**
 * Wrap an element in the MultiGesture component if the user has a touch screen.
 */
const MultiGestureIfTouch: FC = ({ children }) =>
  isTouch ? (
    <MultiGesture
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

/**
 * The main app component.
 */
const AppComponent: FC<Props> = props => {
  const {
    dark,
    dragInProgress,
    enableLatestShortcutsDiagram,
    isLoading,
    showModal,
    scale,
    showSplitView,
    splitPosition,
    fontSize,
  } = props

  const dispatch = useDispatch()
  const [splitView, updateSplitView] = useState(showSplitView)
  const [isSplitting, updateIsSplitting] = useState(false)
  const colors = useSelector(themeColors)

  const tutorial = useSelector(isTutorial)

  const onSplitResize = useCallback(
    _.throttle((n: number) => dispatch(updateSplitPosition(n)), 8),
    [],
  )

  useDisableLongPressToSelect()

  useLayoutEffect(() => {
    document.body.classList[dark ? 'add' : 'remove']('dark')
    if (globals.simulateDrag) {
      document.body.classList.add('debug-simulate-drag')
    }
    if (globals.simulateDrop) {
      document.body.classList.add('debug-simulate-drop')
    }
  }, [dark])

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

  const componentClassNames = classNames({
    // mobile safari must be detected because empty and full bullet points in Helvetica Neue have different margins
    mobile: isTouch,
    android: isAndroid,
    native: Capacitor.isNativePlatform(),
    'drag-in-progress': dragInProgress,
    chrome: /Chrome/.test(navigator.userAgent),
    safari: isSafari(),
  })

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
      // Android only, set statusbar color to black.
      if (Capacitor.getPlatform() === 'android') {
        StatusBar.setBackgroundColor({
          color: colors.bg,
        })
      }
    }
  }, [])

  const globalStyles = useMemo<[string, React.CSSProperties][]>(
    () => [
      [
        // increase specificity to override .popup .modal-actions
        'a.button.button.button:hover, a.button.button.button:active',
        {
          backgroundColor: colors.fg85,
        },
      ],
      [
        'a.button.button-outline',
        {
          backgroundColor: colors.bg,
          border: `solid 1px ${colors.fg}`,
          color: colors.fg,
        },
      ],
      [
        'a.button.button.button.button-outline:hover, a.button.button.button.button-outline:active',
        {
          backgroundColor: colors.gray15,
        },
      ],
    ],
    [colors],
  )

  if (showModal && !modals[showModal]) {
    throw new Error(`Missing component for Modal type: ${showModal}`)
  }

  const Modal = showModal ? modals[showModal] : null

  return (
    <div className={componentClassNames}>
      <GlobalStyles styles={globalStyles} />
      <Alert />
      <ErrorMessage />
      {enableLatestShortcutsDiagram && <LatestShortcutsDiagram position='bottom' />}
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
          // navigation, content, and footer
          <>
            {tutorial && !isLoading ? <Tutorial /> : null}
            {DISABLE_SPLIT_PANE ? (
              // overflow: hidden is needed to prevent the content from briefly scrolling horizontally during a gesture.
              <div style={{ position: 'relative', fontSize, overflow: 'hidden' }}>
                <Suspense fallback={<ContentFallback />}>
                  <Content />
                </Suspense>
              </div>
            ) : (
              <SplitPane
                className={isSplitting ? 'animating' : undefined}
                defaultSize={!splitView ? '100%' : splitPosition || '50%'}
                onChange={onSplitResize}
                size={!splitView ? '100%' : splitPosition || '50%'}
                split='vertical'
                style={{ position: 'relative', fontSize }}
              >
                <Suspense fallback={<ContentFallback />}>
                  <Content />
                </Suspense>
                {showSplitView ? (
                  <Suspense fallback={<ContentFallback />}>
                    <Content />
                  </Suspense>
                ) : (
                  // children required by SplitPane
                  <></>
                )}
              </SplitPane>
            )}

            <div
              className='z-index-stack'
              style={{
                position: 'sticky',
                // cannot use safe-area-inset because of mobile Safari z-index issues
                bottom: 0,
              }}
            >
              {/* {isTouch && <SidebarGutter />} */}
              <Scale amount={scale!} origin='bottom left'>
                <NavBar position='bottom' />
              </Scale>
            </div>
          </>
        )}

        {!showModal && isDocumentEditable() && (
          <div style={{ fontSize }}>
            <Footer />
          </div>
        )}
      </MultiGestureIfTouch>
    </div>
  )
}

export default connect(mapStateToProps)(AppComponent)
