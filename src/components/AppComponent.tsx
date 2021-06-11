import React, { FC, Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react'
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
import { Index } from '../types'

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
  const { dragInProgress, isLoading, splitPosition, showSplitView, enableLatestShorcutsDiagram } = state
  const dark = theme(state) !== 'Light'
  const scale = state.fontSize / BASE_FONT_SIZE
  return {
    dark,
    dragInProgress,
    isLoading,
    scale,
    splitPosition,
    showSplitView,
    fontSize: state.fontSize,
    enableLatestShorcutsDiagram
  }
}

const mapDispatchToProps = { updateSplitPos: updateSplitPosition }

const addSpaceOnKeybordUp = isSafari() && isTouch && window.visualViewport

type Props = StateProps & DispatchProps

/** Cancel gesture if there is an active text selection on active drag. */
const shouldCancelGesture = () => !!window.getSelection()?.toString() || store.getState().dragInProgress

/**
 * Wrap an element in the MultiGesture componentt if the user has a touch screen.
 */
const MultiGestureIfTouch: FC = ({ children }) => isTouch
  ? <MultiGesture onGesture={handleGestureSegment} onEnd={handleGestureEnd} shouldCancelGesture={shouldCancelGesture}>{children}</MultiGesture>
  : <>{children}</>

const modalIndex: Index<FC> = {
  welcome: ModalWelcome,
  help: ModalHelp,
  export: ModalExport,
  feedback: ModalFeedback,
  auth: ModalAuth,
}

/** Render active modal. */
const ModalGroup = () => {
  const showModal = useSelector((state: State) => state.showModal)
  const Modal = showModal && modalIndex[showModal]
  return <>
    {Modal && <Modal/>}
  </>
}

/**
 * Add space at the bottom of the scrollable container to allow footer to be seen when the keyboard is up on ios safari.
 */
const IOSKeyboardUpSpace = () => {

  const [isKeyboardUp, setIsKeyboardUp] = useState(false)

  const handleChange = useCallback(() => {
    if (window.visualViewport.height <= 480) setIsKeyboardUp(true)
    if (window.visualViewport.height > 480) setIsKeyboardUp(false)
  }, [])

  useEffect(() => {
    window.visualViewport.addEventListener('resize', handleChange)

    return () => {
      window.removeEventListener('resize', handleChange)
    }
  }, [])

  return isKeyboardUp ? <div style={{ width: '100%', height: '230px' }}></div> : null
}

/**
 * The main app component.
 */
const AppComponent: FC<Props> = props => {
  const { dark, dragInProgress, enableLatestShorcutsDiagram, isLoading, scale, showSplitView, splitPosition, updateSplitPos, fontSize } = props

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
    safari: isSafari(),
  })

  return (
    <div className={componentClassNames}>
      <Alert />
      <ErrorMessage />
      { enableLatestShorcutsDiagram && <LatestShortcutsDiagram position='bottom' />}

      {isDocumentEditable() && !tutorial && <>
        <Sidebar />
        <HamburgerMenu />
      </>}

      {!tutorial && <Toolbar />}

      <ModalGroup/>
      <div id='scrollable-container'>
        <MultiGestureIfTouch>
          {tutorial && !isLoading ? <Tutorial /> : null}
          <div style={{ minHeight: '100%' }}>
            <SplitPane
              style={{ position: 'relative', fontSize }}
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

            <div className='nav-bottom-wrapper'>
              <Scale amount={scale!} origin='bottom left'>
                <NavBar position='bottom' />
              </Scale>
            </div>
            {isDocumentEditable() && <div style={{ fontSize }}>
              <Footer />
            </div>}
            {addSpaceOnKeybordUp && <IOSKeyboardUpSpace/>}
          </div>
        </MultiGestureIfTouch>
      </div>
    </div>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(AppComponent)
