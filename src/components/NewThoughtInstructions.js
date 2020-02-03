import React from 'react'
import { connect } from 'react-redux'
import assert from 'assert'
import { isMobile } from '../browser.js'
import { shortcutById } from '../shortcuts.js'

// constants
import {
  TUTORIAL_STEP_FIRSTTHOUGHT,
} from '../constants.js'

// components
import { GestureDiagram } from './GestureDiagram.js'

// util
import {
  getSetting,
  isTutorial,
} from '../util.js'

// assert the search shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
assert(newThoughtShortcut)

export const NewThoughtInstructions = connect(({ isLoading, status }) => ({ isLoading, status, tutorialStep: +getSetting('Tutorial Step')[0] }))(({ children, isLoading: localLoading, status, tutorialStep }) =>

  // loading
  // show loading message if local store is loading or if remote is loading and there are no children
  localLoading || ((status === 'connecting' || status === 'loading') && children.length === 0) ? <div className='center-in-content'>
    <i className='text-note'>Loading...</i>
  </div>

  // tutorial no children
  // show special message when there are no children in tutorial
  : isTutorial()
    ? children.length === 0 && (tutorialStep !== TUTORIAL_STEP_FIRSTTHOUGHT || !isMobile)
      ? <div className='center-in-content'>
        <i className='text-note'>Ahhh. Open space. Unlimited possibilities.</i>
      </div>
    // hide on mobile during TUTORIAL_STEP_FIRSTTHOUGHT since the gesture diagram is displayed
    : null

  // default
  : <React.Fragment>
    <React.Fragment>{isMobile
      ? <span className='gesture-container'>Swipe <GestureDiagram path={newThoughtShortcut.gesture} size='30' color='darkgray' /></span>
      : <span>Hit the Enter key</span>
    } to add a new thought.</React.Fragment>
  </React.Fragment>
)
