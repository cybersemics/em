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
  isTutorial,
} from '../util.js'

// assert the search shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
assert(newThoughtShortcut)

export const NewThoughtInstructions = connect(({ isLoading, settings: { tutorialStep } = {}, status }) => ({ isLoading, status, tutorialStep }))(({ children, isLoading, status, tutorialStep }) =>

  !isLoading
    ? !isTutorial() ? <React.Fragment>{isMobile
        ? <span className='gesture-container'>Swipe <GestureDiagram path={newThoughtShortcut.gesture} size='30' color='darkgray' /></span>
        : <span>Hit the Enter key</span>
      } to add a new thought.
    </React.Fragment> :

    // show this when there are no children
    // hide on mobile during TUTORIAL_STEP_FIRSTTHOUGHT since the gesture diagram is displayed
    children.length === 0 && (tutorialStep !== TUTORIAL_STEP_FIRSTTHOUGHT || !isMobile) ? <div className='center-in-content'>
      <i className='text-note'>Ahhh. Open space. Unlimited possibilities.</i>
    </div>
    : null
  : null
)
