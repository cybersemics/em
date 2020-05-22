import React from 'react'
import TutorialNavigationButton from './TutorialNavigationButton'
import { store } from '../../store'

import {
  TUTORIAL_STEP_START,
} from '../../constants'

import {
  tutorialPrev,
} from '../../action-creators/tutorial'

// eslint-disable-next-line jsdoc/require-jsdoc
const TutorialNavigationPrev = ({ tutorialStep }) =>
  <TutorialNavigationButton
    classes='tutorial-prev'
    disabled={tutorialStep === TUTORIAL_STEP_START}
    clickHandler={() => store.dispatch(tutorialPrev(tutorialStep))}
    value='Prev' />

export default TutorialNavigationPrev
