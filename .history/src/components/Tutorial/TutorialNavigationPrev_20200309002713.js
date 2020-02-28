import React from 'react'
import { TutorialNavigationButton } from './TutorialNavigationButton'

import {
  TUTORIAL_STEP_START
} from '../../constants'

import {
  tutorialPrev,
} from '../../action-creators/tutorial'

export const TutorialNavigationPrev = ({ tutorialStep }) => (
  <TutorialNavigationButton
    classes='tutorial-prev'
    disabled={tutorialStep === TUTORIAL_STEP_START}
    clickHandler={() => tutorialPrev(tutorialStep)}
    value='Prev' />
)
