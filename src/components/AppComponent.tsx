import React, { FC, useState, useEffect, useLayoutEffect } from 'react'
import { connect, useSelector } from 'react-redux'
import classNames from 'classnames'
import SplitPane from 'react-split-pane'

import { isMobile, isAndroid } from '../browser'
import { handleGestureSegment, handleGestureEnd } from '../shortcuts'

// components
import Alert from './Alert'
import Content from './Content'
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

// util
import {
  isDocumentEditable,
  initialState,
} from '../util'

// selectors
import { getSetting, isTutorial } from '../selectors'
import theme from '../selectors/theme'

// action-creators
import updateSplitPosition from '../action-creators/updateSplitPosition'

const fontSizeLocal = +(localStorage['Settings/Font Size'] || 16)
const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'

const initialStateResult = initialState()
interface StateProps {
  dark?: boolean;
  dragInProgress: boolean;
  isLoading: boolean;
  showModal: string;
  scale: number;
  showSplitView: boolean;
  splitPosition: number;
}

interface DispatchProps {
  updateSplitPos: (splitPos: number) => void;
}

// ???
// @ts-ignore
type typeOfState = ReturnType<typeof initialStateResult>

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: typeOfState): StateProps => {
  const { dragInProgress, isLoading, showModal, splitPosition, showSplitView } = state
  const dark = theme(state) !== 'Light'
  const scale = (isLoading ? fontSizeLocal : getSetting(state, 'Font Size') || 16) / 16
  return {
    dark,
    dragInProgress,
    isLoading,
    scale,
    showModal,
    splitPosition,
    showSplitView,
  }
}

const mapDispatchToProps = { updateSplitPos: updateSplitPosition }

type Props = StateProps & DispatchProps

const MultiGestureIfMobile: FC = ({ children }) => isMobile
  ? <MultiGesture onGesture={handleGestureSegment} onEnd={handleGestureEnd}>{children}</MultiGesture>
  : <>{children}</>

const AppComponent: FC<Props> = (props) => {
  const { dark, dragInProgress, isLoading, showModal, scale, showSplitView, splitPosition, updateSplitPos } = props

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
    mobile: isMobile,
    android: isAndroid,
    'drag-in-progress': dragInProgress,
    chrome: /Chrome/.test(navigator.userAgent),
    safari: /Safari/.test(navigator.userAgent),
  })

  return (
    <div className={componentClassNames}>

      {isDocumentEditable() && <>
        <Sidebar />
        <HamburgerMenu dark={dark} />
      </>}

      <MultiGestureIfMobile>

        <Alert />
        <ErrorMessage />

        {showModal

          // modals
          ? <>
            <ModalWelcome />
            <ModalHelp />
            <ModalExport />
          </>

          // navigation, content, and footer
          : <>
              <Toolbar />
              {tutorial && !isLoading ? <Tutorial /> : null}
              <SplitPane
                style={{ position: 'relative' }}
                className={isSplitting ? 'animating' : ''}
                split='vertical'
                defaultSize={!splitView ? '100%' : splitPosition || '50%'}
                size={!splitView ? '100%' : splitPosition || '50%'}
                onDragFinished={updateSplitPos}
              >
                <Scale amount={scale}>
                  <Content />
                </Scale>

                {showSplitView
                  ? (
                    <Scale amount={scale}>
                      <Content />
                    </Scale>
                  )
                  // children required by SplitPane
                  : <div />}
              </SplitPane>

              <div className='nav-bottom-wrapper'>
                <Scale amount={scale}>

                  <NavBar position='bottom' />

                </Scale>
              </div>

              {isDocumentEditable() && <Scale amount={scale}>
                <Footer />
              </Scale>}

            </>
          }

      </MultiGestureIfMobile>
    </div>
  )
}

export default connect<StateProps, DispatchProps>(mapStateToProps, mapDispatchToProps)(AppComponent)
