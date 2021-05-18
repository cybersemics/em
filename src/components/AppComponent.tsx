import React, { FC, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { connect, useSelector } from 'react-redux'
import classNames from 'classnames'
import SplitPane from 'react-split-pane'
import { isAndroid, isSafari, isTouch } from '../browser'
import { BASE_FONT_SIZE } from '../constants'
import { inputHandlers } from '../shortcuts'
import { isDocumentEditable } from '../util'
import { isTutorial, theme } from '../selectors'
import { State } from '../util/initialState'
import { updateSplitPosition } from '../action-creators'
import { store } from '../store'

// components
import Alert from './Alert'
import ContentFallback from './ContentFallback'
import Sidebar from './Sidebar'
import ErrorMessage from './ErrorMessage'
import Footer from './Footer'
import ModalHelp from './ModalHelp'
import ModalWelcome from './ModalWelcome'
import MultiGesture from './MultiGesture'
import ModalExport from './ModalExport'
import NavBar from './NavBar'
import Scale from './Scale'
import Tutorial from './Tutorial'
import Toolbar from './Toolbar'
import HamburgerMenu from './HamburgerMenu'
import ModalFeedback from './ModalFeedback'
import ModalAuth from './ModalAuth'
import LatestShortcutsDiagram from './LatestShortcutsDiagram'
import useViewportChange from '../hooks/useViewportChange'

const Content = React.lazy(() => import('./Content'))

const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'
const { handleGestureEnd, handleGestureSegment } = inputHandlers(store)

interface StateProps {
  dark?: boolean,
  dragInProgress?: boolean,
  isLoading?: boolean,
  showModal?: string | null,
  scale?: number,
  showSplitView?: boolean,
  splitPosition?: number,
  fontSize: number,
  enableLatestShorcutsDiagram: boolean,
}

interface DispatchProps {
  updateSplitPos: (splitPos: number) => void,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State): StateProps => {
  const { dragInProgress, isLoading, showModal, splitPosition, showSplitView, enableLatestShorcutsDiagram } = state
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
    enableLatestShorcutsDiagram
  }
}

const mapDispatchToProps = { updateSplitPos: updateSplitPosition }

type Props = StateProps & DispatchProps

/** Cancel gesture if there is an active text selection on active drag. */
const shouldCancelGesture = () => !!window.getSelection()?.toString() || store.getState().dragInProgress

/**
 * Wrap an element in the MultiGesture componentt if the user has a touch screen.
 */
const MultiGestureIfTouch: FC = ({ children }) => isTouch
  ? <MultiGesture onGesture={handleGestureSegment} onEnd={handleGestureEnd} shouldCancelGesture={shouldCancelGesture}>{children}</MultiGesture>
  : <>{children}</>

/**
 * Navbar place at the bottom.
 */
const NavBarBottom: FC<{ scale?: number }> = ({ scale }) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  /** Keep nav bar above active keyboard on ios safari. */
  const handleVisualViewportChange = useCallback(() => {
    if (isSafari() && isTouch) {
      requestAnimationFrame(() => {
        const bottom = window.innerHeight - window.visualViewport.height
        if (wrapperRef.current) wrapperRef.current.style.bottom = `${bottom}px`
      })
    }
  }, [])

  useViewportChange(handleVisualViewportChange)

  return <div ref={wrapperRef} className='nav-bottom-wrapper'>
    <Scale amount={scale!} origin='bottom left'>
      <NavBar position='bottom' />
    </Scale>
  </div>
}
/**
 * The main app component.
 */
const AppComponent: FC<Props> = props => {
  const { dark, dragInProgress, enableLatestShorcutsDiagram, isLoading, showModal, scale, showSplitView, splitPosition, updateSplitPos, fontSize } = props

  const [splitView, updateSplitView] = useState(showSplitView)
  const [isSplitting, updateIsSplitting] = useState(false)

  const tutorialSettings = useSelector(isTutorial)
  const tutorial = isLoading ? tutorialLocal : tutorialSettings

  useLayoutEffect(() => {
    document.body.classList[dark ? 'add' : 'remove']('dark')
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
    container: true,
    // mobile safari must be detected because empty and full bullet points in Helvetica Neue have different margins
    mobile: isTouch,
    android: isAndroid,
    'drag-in-progress': dragInProgress,
    chrome: /Chrome/.test(navigator.userAgent),
    safari: /Safari/.test(navigator.userAgent),
  })

  return (
    <div className={componentClassNames}>

      <Alert />
      <ErrorMessage />
      { enableLatestShorcutsDiagram && <LatestShortcutsDiagram position='bottom' />}

      {isDocumentEditable() && !tutorial && !showModal && <>
        <Sidebar />
        <HamburgerMenu />
      </>}

      {!showModal && !tutorial && <Toolbar />}

      <MultiGestureIfTouch>

        {showModal

          // modals
          // eslint-disable-next-line @typescript-eslint/no-extra-parens
          ? showModal === 'welcome' ? <ModalWelcome />
          : showModal === 'help' ? <ModalHelp />
          : showModal === 'export' ? <ModalExport />
          : showModal === 'feedback' ? <ModalFeedback />
          : showModal === 'auth' ? <ModalAuth />
          : 'Invalid showModal'

          // navigation, content, and footer
          : <>
            {tutorial && !isLoading ? <Tutorial /> : null}
            <SplitPane
              style={{ position: 'relative', fontSize: fontSize + 'px' }}
              className={isSplitting ? 'animating' : ''}
              split='vertical'
              defaultSize={!splitView ? '100%' : splitPosition || '50%'}
              size={!splitView ? '100%' : splitPosition || '50%'}
              onDragFinished={updateSplitPos}
            >
              <Suspense fallback={<ContentFallback />}>
                <Content />
              </Suspense>
              {showSplitView
                ?
                <Content />
              // children required by SplitPane
                : <div />}
            </SplitPane>
            <NavBarBottom scale={scale}/>
          </>
        }

        {!showModal && isDocumentEditable() && <Scale amount={scale!}>
          <Footer />
        </Scale>}

      </MultiGestureIfTouch>
    </div>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(AppComponent)
