import React from 'react'
import { connect } from 'react-redux'
import assert from 'assert'
import { isMobile } from '../browser.js'
import { shortcutById } from '../shortcuts.js'

// constants
import {
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_END,
} from '../constants.js'

// components
import { GestureDiagram } from './GestureDiagram.js'

// assert the search shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
assert(newThoughtShortcut)

export const NewThoughtInstructions = connect(({ settings: { tutorialStep } = {} }) => ({ tutorialStep }))(({ children, tutorialStep }) =>

  tutorialStep === TUTORIAL_STEP_END ? <React.Fragment>{isMobile
      ? <span>Swipe <GestureDiagram path={newThoughtShortcut.gesture} size='14' color='darkgray' /></span>
      : <span>Type Enter</span>
    } to add a new thought.
  </React.Fragment> :

  // show this when there are no children
  children.length === 0 && tutorialStep !== TUTORIAL_STEP_FIRSTTHOUGHT ? <i className='text-note'>Ahhh. Open space. Unlimited possibilities.</i>
  : null
)