import assert from 'assert'
import React, { Fragment } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { TransitionGroup } from 'react-transition-group'
import { isMobile } from '../../browser'
import { WithCSSTransition } from './WithCSSTransition'

// constants
import {
  ROOT_TOKEN,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT_HINT,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUBTHOUGHT_ENTER,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL2_STEP_START,
  TUTORIAL2_STEP_CHOOSE,
  TUTORIAL2_STEP_CONTEXT1_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT1_HINT,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT2_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT2_HINT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
  TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
  TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_VERSION_TODO,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../../constants'

import {
  tutorialNext,
  tutorialPrev,
} from '../../action-creators/tutorial'

import {
  shortcutById,
} from '../../shortcuts'

import {
  getSetting,
  getThoughtsRanked,
  hashContext,
  headValue,
} from '../../util'

import TutorialStepComponentMap from './TutorialStepComponentMap'

// components
import { GestureDiagram } from '../GestureDiagram'

// assert shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
assert(newThoughtShortcut)

// returns true if the first context thought has been created, e.g. /Home/To Do/x
const context1SubthoughtCreated = ({ rootSubthoughts, tutorialChoice }) =>
  // e.g. Home
  rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) &&
  // e.g. Home/To Do
  getThoughtsRanked([TUTORIAL_CONTEXT1_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) &&
  // e.g. Home/To Do/x
  getThoughtsRanked([TUTORIAL_CONTEXT1_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0

// returns true if the first context thought has been created, e.g. /Work/To Do/y
const context2SubthoughtCreated = ({ rootSubthoughts, tutorialChoice }) =>
  // e.g. Work
  rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) &&
  // e.g. Work/To Do
  getThoughtsRanked([TUTORIAL_CONTEXT2_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) &&
  // e.g. Work/To Do/y
  getThoughtsRanked([TUTORIAL_CONTEXT2_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0

const TutorialNext = connect(({ contextIndex, cursor, expanded = {} }) => ({
  contextIndex,
  cursor,
  expanded,
  tutorialChoice: +getSetting('Tutorial Choice') || 0,
  tutorialStep: +getSetting('Tutorial Step') || 1
}))(
  ({
    contextIndex,
    cursor,
    expanded,
    tutorialChoice,
    tutorialStep
  }) => {

    const rootSubthoughts = contextIndex[hashContext([ROOT_TOKEN])] || []
    return [
      TUTORIAL_STEP_START,
      TUTORIAL_STEP_SUCCESS,
      TUTORIAL2_STEP_START,
      TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
      TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
      TUTORIAL2_STEP_SUCCESS,
    ].includes(tutorialStep) ||
      (tutorialStep === TUTORIAL_STEP_AUTOEXPAND && Object.keys(expanded).length === 0) ||
      ((tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER ||
        tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER ||
        tutorialStep === TUTORIAL_STEP_SUBTHOUGHT_ENTER
      ) && (!cursor || headValue(cursor).length > 0)) ||
      (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT && context1SubthoughtCreated({ rootSubthoughts, tutorialChoice })) ||
      (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT && context2SubthoughtCreated({ rootSubthoughts, tutorialChoice }))
      ? <a className='tutorial-button button button-variable-width' onClick={tutorialNext}>{tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS ? 'Finish' : 'Next'}</a>
      : <span className='tutorial-next-wait text-small'>Complete the instructions to continue</span>
  })

const TutorialPrev = ({ tutorialStep }) => <a className={classNames({
  'tutorial-prev': true,
  button: true,
  'button-variable-width': true
})} disabled={tutorialStep === TUTORIAL_STEP_START} onClick={() => tutorialPrev(tutorialStep)}>Prev</a>

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
      <div className='center'>

        <div className='tutorial-step-bullets'>{Array(tutorialStep < TUTORIAL2_STEP_START
          ? TUTORIAL_STEP_SUCCESS - TUTORIAL_STEP_START + 1
          : TUTORIAL2_STEP_SUCCESS - TUTORIAL2_STEP_START + 1
        ).fill().map((_, i) => {
          const step = i + (tutorialStep < TUTORIAL2_STEP_START ? 1 : TUTORIAL2_STEP_START)
          return <a
            className={classNames({
              'tutorial-step-bullet': true,
              active: step === Math.floor(tutorialStep)
            })}
            key={step}
            onClick={() => dispatch({ type: 'tutorialStep', value: step })}>•</a>
        }
        )}</div>

        {tutorialStep === TUTORIAL_STEP_SUCCESS
          ? <Fragment>
            <a className='tutorial-button button button-variable-width' onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL2_STEP_START })}>Learn more</a>
            <a className='tutorial-button button button-variable-width' onClick={() => dispatch({ type: 'tutorial', value: false })}>Play on my own</a>
          </Fragment>
          : tutorialStep === TUTORIAL2_STEP_CHOOSE
            ? <ul className='simple-list'>
              <li>
                <a className='tutorial-button button button-variable-width' onClick={() => {
                  dispatch({ type: 'tutorialChoice', value: TUTORIAL_VERSION_TODO })
                  tutorialNext()
                }}>To-Do List</a>
              </li>
              <li>
                <a className='tutorial-button button button-variable-width' onClick={() => {
                  dispatch({ type: 'tutorialChoice', value: TUTORIAL_VERSION_JOURNAL })
                  tutorialNext()
                }}>Journal Theme</a>
              </li>
              <li>
                <a className='tutorial-button button button-variable-width' onClick={() => {
                  dispatch({ type: 'tutorialChoice', value: TUTORIAL_VERSION_BOOK })
                  tutorialNext()
                }}>Book/Podcast Notes</a>
              </li>
            </ul>
            : <Fragment>
              <TutorialPrev tutorialStep={tutorialStep} />
              <TutorialNext tutorialStep={tutorialStep} />
            </Fragment>
        }
      </div>
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
