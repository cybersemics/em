import React from 'react'
import { connect } from 'react-redux'
import TutorialNavigationButton from './TutorialNavigationButton'
import { store } from '../../store'

import {
  ROOT_TOKEN,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
  TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
  TUTORIAL2_STEP_START,
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SUBTHOUGHT_ENTER,
  TUTORIAL_STEP_SUCCESS,
} from '../../constants'

import { context1SubthoughtCreated, context2SubthoughtCreated } from './TutorialUtils'

import {
  hashContext,
  headValue,
} from '../../util'

import {
  tutorialNext,
} from '../../action-creators/tutorial'

// selectors
import { getSetting } from '../../selectors'

const mapStateToProps = ({ contextIndex, cursor, expanded = {} }) => ({
  contextIndex,
  cursor,
  expanded,
  tutorialChoice: +getSetting(store.getState(), 'Tutorial Choice') || 0,
  tutorialStep: +getSetting(store.getState(), 'Tutorial Step') || 1
})

const TutorialNavigationNext = connect(mapStateToProps)(
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
      ? <TutorialNavigationButton clickHandler={tutorialNext} value={tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS ? 'Finish' : 'Next'} />
      : <span className='tutorial-next-wait text-small'>Complete the instructions to continue</span>
  })

export default TutorialNavigationNext
