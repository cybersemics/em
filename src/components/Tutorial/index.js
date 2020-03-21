import assert from 'assert'
import React from 'react'
import { connect } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { isMobile } from '../../browser'
import { WithCSSTransition } from './WithCSSTransition'

// constants
import {
  ROOT_TOKEN,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_HINT,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL2_STEP_CONTEXT1_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT1_HINT,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT2_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT2_HINT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../../constants'

import {
  shortcutById,
} from '../../shortcuts'

import {
  getSetting,
  hashContext,
  headValue,
} from '../../util'

import TutorialStepComponentMap from './TutorialStepComponentMap'

// components
import { GestureDiagram } from '../GestureDiagram'
import TutorialNavigation from './TutorialNavigation'

// assert shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
assert(newThoughtShortcut)

const mapStateToProps = state => {
  const { contextIndex, contextViews, cursor, thoughtIndex } = state
  return {
    contextIndex,
    contextViews,
    cursor,
    thoughtIndex,
    tutorialChoice: +getSetting('Tutorial Choice') || 0,
    tutorialStep: +getSetting('Tutorial Step') || 1
  }
}

const Tutorial = ({ contextIndex, contextViews, cursor, tutorialChoice, tutorialStep, dispatch }) => {

  const rootSubthoughts = contextIndex[hashContext([ROOT_TOKEN])] || []

  const tutorialStepProps = { cursor, tutorialChoice, rootSubthoughts, contextViews, dispatch, key: Math.floor(tutorialStep) }

  const tutorialStepComponent = TutorialStepComponentMap[Math.floor(tutorialStep)]
  return <div className='tutorial'><div className='tutorial-inner'>
    <a className='upper-right tutorial-skip text-small' style={{ visibility: tutorialStep !== TUTORIAL_STEP_SUCCESS && tutorialStep !== TUTORIAL2_STEP_SUCCESS ? 'visible' : 'hidden' }} onClick={() => dispatch({ type: 'tutorial', value: false })}>✕ close tutorial</a>
    <div className='clear'>
      <div className='tutorial-text'>
        <TransitionGroup>
          {tutorialStepComponent ? WithCSSTransition({ component: tutorialStepComponent, ...tutorialStepProps }) :
            (<p>Oops! I am supposed to continue the tutorial, but I do not recognize tutorial step {tutorialStep}.</p>)
          }
        </TransitionGroup>
      </div>
      <TutorialNavigation tutorialStep={tutorialStep} dispatch={dispatch} />

    </div>

    {isMobile && (
      tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ||
      tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ||
      tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ||
      tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE ||
      tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase())
    )
      ? <div className='tutorial-trace-gesture'>
        <GestureDiagram path={
          tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ||
            tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT
            ? shortcutById('newThought').gesture
            : tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ||
              tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT ||
              tutorialStep === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT ||
              tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT ||
              tutorialStep === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT
              ? shortcutById('newSubthought').gesture
              : tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE
                ? shortcutById('toggleContextView').gesture
                : null
        }
        size='160'
        strokeWidth='10'
        arrowSize='5'
        className='animate-pulse'
        />
      </div>
      : null
    }

  </div></div>
}

export default connect(mapStateToProps)(Tutorial)
