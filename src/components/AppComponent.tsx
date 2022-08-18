import classNames from 'classnames'
import React, { FC, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { connect, useSelector } from 'react-redux'
import SplitPane from 'react-split-pane'
import State from '../@types/State'
import alert from '../action-creators/alert'
import updateSplitPosition from '../action-creators/updateSplitPosition'
import { isAndroid, isTouch } from '../browser'
import { AlertType, BASE_FONT_SIZE } from '../constants'
import * as selection from '../device/selection'
import globals from '../globals'
import isTutorial from '../selectors/isTutorial'
import theme from '../selectors/theme'
import { inputHandlers } from '../shortcuts'
import { store } from '../store'
import isDocumentEditable from '../util/isDocumentEditable'
import storage from '../util/storage'
import Alert from './Alert'
import ContentFallback from './ContentFallback'
import DeleteDrop from './DeleteDrop'
import ErrorMessage from './ErrorMessage'
import Footer from './Footer'
import LatestShortcutsDiagram from './LatestShortcutsDiagram'
import ModalAuth from './ModalAuth'
import ModalExport from './ModalExport'
import ModalFeedback from './ModalFeedback'
import ModalHelp from './ModalHelp'
import ModalInvites from './ModalInvites'
import ModalSignup from './ModalSignup'
import ModalWelcome from './ModalWelcome'
import MultiGesture from './MultiGesture'
import NavBar from './NavBar'
import Scale from './Scale'
import Toolbar from './Toolbar'
import Tutorial from './Tutorial'

const Content = React.lazy(() => import('./Content'))

const tutorialLocal = storage.getItem('Settings/Tutorial') === 'On'
const { handleGestureEnd, handleGestureSegment } = inputHandlers(store)

interface StateProps {
  dark?: boolean
  dragInProgress?: boolean
  isLoading?: boolean
  showModal?: string | null
  scale?: number
  showSplitView?: boolean
  splitPosition?: number
  fontSize: number
  enableLatestShorcutsDiagram: boolean
  isUserLoading?: boolean
}

interface DispatchProps {
  updateSplitPos: (splitPos: number) => void
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
    enableLatestShorcutsDiagram,
  }
}

const mapDispatchToProps = { updateSplitPos: updateSplitPosition }

type Props = StateProps & DispatchProps

/** Cancel gesture if there is an active text selection or active drag. */
const shouldCancelGesture = () => (selection.isActive() && !selection.isCollapsed()) || store.getState().dragInProgress

/** Dismiss gesture hint that is shown by alert. */
const handleGestureCancel = () => {
  store.dispatch((dispatch, getState) => {
    if (getState().alert?.alertType === AlertType.GestureHintExtended) {
      dispatch(alert(null))
    }
  })
}

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
    enableLatestShorcutsDiagram,
    isLoading,
    showModal,
    scale,
    showSplitView,
    splitPosition,
    updateSplitPos,
    fontSize,
  } = props

  const [splitView, updateSplitView] = useState(showSplitView)
  const [isSplitting, updateIsSplitting] = useState(false)

  const tutorialSettings = useSelector(isTutorial)
  const tutorial = isLoading ? tutorialLocal : tutorialSettings

  useLayoutEffect(() => {
    document.body.classList[dark ? 'add' : 'remove']('dark')
    if (globals.simulateDropHover || globals.simulateDropHover) {
      document.body.classList.add('debug-simulate-drag')
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
    attributeName: '=styleContainer',
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
      {enableLatestShorcutsDiagram && <LatestShortcutsDiagram position='bottom' />}

      {/* isDocumentEditable() && !tutorial && !showModal && (
        <>
          <Sidebar />
          <HamburgerMenu />
        </>
      ) */}

      {!showModal && !tutorial && <Toolbar />}

      {isTouch && <DeleteDrop />}

      <MultiGestureIfTouch>
        {showModal ? (
          // modals
          // eslint-disable-next-line @typescript-eslint/no-extra-parens
          showModal === 'welcome' ? (
            <ModalWelcome />
          ) : showModal === 'help' ? (
            <ModalHelp />
          ) : showModal === 'export' ? (
            <ModalExport />
          ) : showModal === 'feedback' ? (
            <ModalFeedback />
          ) : showModal === 'auth' ? (
            <ModalAuth />
          ) : showModal === 'signup' ? (
            <ModalSignup />
          ) : showModal === 'invites' ? (
            <ModalInvites />
          ) : (
            'Invalid showModal'
          )
        ) : (
          // navigation, content, and footer
          <>
            {tutorial && !isLoading ? <Tutorial /> : null}
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
              {showSplitView ? (
                <Content />
              ) : (
                // children required by SplitPane
                <div />
              )}
            </SplitPane>

            <div className='nav-bottom-wrapper'>
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

export default connect(mapStateToProps, mapDispatchToProps)(AppComponent)
