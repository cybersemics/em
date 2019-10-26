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

export const NewThoughtInstructions = connect(({ settings: { tutorialStep } = {} }) => ({ tutorialStep }))(({ children, tutorialStep }) =>

  !isTutorial() ? <React.Fragment>{isMobile
      ? <span>Swipe <GestureDiagram path={newThoughtShortcut.gesture} size='14' color='darkgray' /></span>
      : <span>Hit the Enter key</span>
    } to add a new thought.
  </React.Fragment> :

  // show this when there are no children
  children.length === 0 && tutorialStep !== TUTORIAL_STEP_FIRSTTHOUGHT ? <div className='center-in-content'>
    <i className='text-note'>Ahhh. Open space. Unlimited possibilities.</i>
  </div>
  : null
)