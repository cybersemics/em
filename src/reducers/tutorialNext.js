// constants
import {
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_STEP_SUCCESS,
} from '../constants'

// util
import { getSetting } from '../selectors'

// reducers
import tutorial from './tutorial'
import tutorialStepReducer from './tutorialStep'

/** Advances the tutorial one step (whole step by default; optional hint argument for fractional step). */
const tutorialNext = (state, { hint } = {}) => {

  const tutorialStep = +getSetting(state, 'Tutorial Step')

  return tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS
    // end
    ? tutorial(state, {
      value: false
    })
    // next
    : tutorialStepReducer(state, {
      value: !hint ? Math.floor(tutorialStep) + 1 : tutorialStep + 0.1
    })
}

export default tutorialNext
