import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import TutorialNavigationButton from './TutorialNavigationButton.native'
import { context1SubthoughtCreated, context2SubthoughtCreated } from './TutorialUtils'
import headValue from '../../util/headValue'
import getSetting from '../../selectors/getSetting'
import { getAllChildren } from '../../selectors/getChildren'
import tutorialNext from '../../action-creators/tutorialNext'

import {
  HOME_TOKEN,
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
import { Text } from '../Text.native'
import { commonStyles } from '../../style/commonStyles'
import State from '../../@types/State'

const tutorialSteps = [
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL2_STEP_START,
  TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
  TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
  TUTORIAL2_STEP_SUCCESS,
]

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialNavigationNext = () => {
  const { cursorValue, expanded, rootChildren, tutorialChoice, tutorialStep } = useSelector((state: State) => {
    const {
      thoughts: { thoughtIndex },
      cursor,
      expanded = {},
    } = state

    return {
      thoughtIndex,
      expanded,
      rootChildren: getAllChildren(state, HOME_TOKEN),
      tutorialChoice: +(getSetting(state, 'Tutorial Choice') || 0),
      tutorialStep: +(getSetting(state, 'Tutorial Step') || 1),
      cursorValue: cursor && headValue(state, cursor),
    }
  })

  const dispatch = useDispatch()

  /** Check if user has completed a tutorial step. */
  const isTutorialStepCompleted = (): boolean => {
    return (
      tutorialSteps.includes(tutorialStep) ||
      (tutorialStep === TUTORIAL_STEP_AUTOEXPAND && Object.keys(expanded).length === 0) ||
      ((tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER ||
        tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER ||
        tutorialStep === TUTORIAL_STEP_SUBTHOUGHT_ENTER) &&
        (!cursorValue || cursorValue.length > 0)) ||
      (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT &&
        context1SubthoughtCreated({ rootChildren, tutorialChoice })) ||
      (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT &&
        context2SubthoughtCreated({ rootChildren, tutorialChoice }))
    )
  }

  return isTutorialStepCompleted() ? (
    <TutorialNavigationButton
      clickHandler={() => dispatch(tutorialNext({}))}
      value={tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS ? 'Finish' : 'Next'}
    />
  ) : (
    <Text style={[commonStyles.smallText, commonStyles.flexOne, commonStyles.centerText]}>
      Complete the instructions to continue
    </Text>
  )
}

export default TutorialNavigationNext
