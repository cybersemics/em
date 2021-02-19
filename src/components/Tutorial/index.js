import assert from 'assert'
import React from 'react'
import { connect } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { isTouch } from '../../browser'
import WithCSSTransition from './WithCSSTransition'
import { shortcutById } from '../../shortcuts'
import { headValue } from '../../util'
import { getParent, getSetting } from '../../selectors'
import { tutorial } from '../../action-creators'

// constants
import {
  HOME_TOKEN,
  TUTORIAL2_STEP_CONTEXT1_HINT,
  TUTORIAL2_STEP_CONTEXT1_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT2_HINT,
  TUTORIAL2_STEP_CONTEXT2_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_HINT,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUCCESS,
} from '../../constants'

// components
import TutorialStepComponentMap from './TutorialStepComponentMap'
import GestureDiagram from '../GestureDiagram'
import TutorialNavigation from './TutorialNavigation'

// assert shortcut at load time
const newThoughtShortcut = shortcutById('newThoughtOrOutdent')
assert(newThoughtShortcut)

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = state => {
  const { contextViews, cursor } = state
  return {
    contextViews,
    cursor,
    rootChildren: getParent(state, [HOME_TOKEN])?.children,
    tutorialChoice: +getSetting(state, 'Tutorial Choice') || 0,
    tutorialStep: +getSetting(state, 'Tutorial Step') || 1
  }
}

/** Tutorial component. */
const Tutorial = ({ contextViews, cursor, rootChildren, tutorialChoice, tutorialStep, dispatch }) => {

  rootChildren = rootChildren || []

  const tutorialStepProps = { cursor, tutorialChoice, rootChildren, contextViews, dispatch, key: Math.floor(tutorialStep) }

  const tutorialStepComponent = TutorialStepComponentMap[Math.floor(tutorialStep)]
  return <div className='tutorial'><div className='tutorial-inner'>
    <a className='upper-right tutorial-skip text-small' style={{ visibility: tutorialStep !== TUTORIAL_STEP_SUCCESS && tutorialStep !== TUTORIAL2_STEP_SUCCESS ? 'visible' : 'hidden' }} onClick={() => dispatch(tutorial({ value: false }))}>✕ close tutorial</a>
    <div className='clear'>
      <div className='tutorial-text'>
        <TransitionGroup>
          {tutorialStepComponent ? WithCSSTransition({ component: tutorialStepComponent, ...tutorialStepProps }) :
          <p>Oops! I am supposed to continue the tutorial, but I do not recognize tutorial step {tutorialStep}.</p>
          }
        </TransitionGroup>
      </div>
      <TutorialNavigation tutorialStep={tutorialStep} dispatch={dispatch} />

    </div>

    {isTouch && (
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
            ? shortcutById('newThoughtOrOutdent').gesture
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
