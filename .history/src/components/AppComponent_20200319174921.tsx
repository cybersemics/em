import React, { FC, Fragment, useState, useEffect, useLayoutEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import classNames from 'classnames';
import SplitPane from 'react-split-pane';
import { isMobile, isAndroid } from '../browser';
import { store } from '../store';
import { handleGestureSegment, handleGestureEnd } from '../shortcuts';
import { initialState } from '../util/initialState';


// components
import { Alert } from './Alert'
import Content from './Content'
import Sidebar from './Sidebar'
import { ErrorMessage } from './ErrorMessage'
import { Footer } from './Footer'
import { ModalHelp } from './ModalHelp'
import { ModalWelcome } from './ModalWelcome'
import { MultiGesture } from './MultiGesture'
import { ModalExport } from './ModalExport'
import { NavBar } from './NavBar'
import { Status } from './Status'
import { Scale } from './Scale'
import Tutorial from './Tutorial'
import { Toolbar } from './Toolbar'
import HamburgerMenu from './HamburgerMenu'

// util
import {
  isTutorial,
  restoreSelection,
  getSetting
} from '../util';


import { updateSplitPosition } from '../action-creators/updateSplitPosition'

const darkLocal = localStorage['Settings/Theme'] || 'Dark'
const fontSizeLocal = +(localStorage['Settings/Font Size'] || 16)
const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'
const tutorialStepLocal = +(localStorage['Settings/Tutorial Step'] || 1)

const initialStateResult = initialState();
interface StateProps {
  dark?: boolean;
  dragInProgress: boolean;
  isLoading: boolean;
  showModal: boolean;
  scale: number;
  showSplitView: boolean;
  splitPosition: number;
}

interface DispatchProps {
  updateSplitPos: (splitPos: number) => void;
}

type typeOfState = ReturnType<typeof initialStateResult>;

const mapStateToProps = (state: typeOfState): StateProps => {
  const { dragInProgress, isLoading, showModal, splitPosition, showSplitView } = state;
  const dark = (isLoading ? darkLocal : getSetting('Theme')[0]) !== 'Light';
  const scale = (isLoading ? fontSizeLocal : getSetting('Font Size')[0] || 16) / 16;
  return {
    dark,
    dragInProgress,
    isLoading,
    scale,
    showModal,
    splitPosition,
    showSplitView,
  };
};

const mapDispatchToProps = {
  updateSplitPos: updateSplitPosition
};

type Props = StateProps & DispatchProps


const AppComponent: FC<Props> = props => {

  const { dark, dragInProgress, isLoading, showModal, scale, showSplitView, splitPosition, updateSplitPos } = props;

  const [splitView, updateSplitView] = useState(showSplitView)
  const [isSplitting, updateIsSplitting] = useState(false)

  const tutorialSettings = useSelector(isTutorial)
  const tutorial = isLoading ? tutorialLocal : tutorialSettings

  useLayoutEffect(() => {
    document.body.classList[dark ? 'add' : 'remove']('dark')
  }, [dark])

  
  useEffect(() => {
    const { cursor } = store.getState();
    const currentSelection: (Selection | null) = window.getSelection();
    if (!isMobile && cursor && (currentSelection && !currentSelection.focusNode)) {
      restoreSelection(cursor);
    }
  }, []);

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
    safari: /Safari/.test(navigator.userAgent)
  });

  return <div className={componentClassNames}>
    <Sidebar />
    <HamburgerMenu dark={dark} />
    <MultiGesture onGesture={handleGestureSegment} onEnd={handleGestureEnd}>

      <Alert />
      <ErrorMessage />
      <Status />
      <Toolbar />

      {showModal

        // modals
        ? <Fragment>
          <ModalWelcome />
          <ModalHelp />
          <ModalExport />
        </Fragment>

        // navigation, content, and footer
        : <Fragment>

          {tutorial && !isLoading ? <Tutorial /> : null}
          <SplitPane
            style={{ position: 'relative' }}
            className={isSplitting ? 'animating' : ''}
            split="vertical"
            defaultSize={!splitView ? '100%' : splitPosition || '50%'}
            size={!splitView ? '100%' : splitPosition || '50%'}
            onDragFinished={updateSplitPos}
          >
            <Scale amount={scale}>
              <Content />
            </Scale>

            {showSplitView
              ? <Scale amount={scale}>
                <Content />
              </Scale>
              // children required by SplitPane
              : <div />
            }
          </SplitPane>
          <div className="nav-bottom-wrapper">
            <Scale amount={scale}>
              <NavBar position='bottom' />
            </Scale>
          </div>

          <Scale amount={scale}>
<<<<<<< HEAD:src/components/AppComponent.js
=======
            // @ts-ignore: Unreachable code error
            <NavBar position="bottom" />
>>>>>>> adds new lint settings and typescript:src/components/AppComponent.tsx
            <Footer />
          </Scale>

        </Fragment>
      }

    </MultiGesture>
  </div>
}

export default connect<StateProps, DispatchProps>(mapStateToProps, mapDispatchToProps)(AppComponent);