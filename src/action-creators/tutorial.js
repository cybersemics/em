// constants
import {
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_STEP_SUCCESS,
} from '../constants'

// util
import { getSetting } from '../selectors'

/** Advances the tutorial one step (whole step by default; optional hint argument for fractional step). */
export const tutorialNext = ({ hint } = {}) => (dispatch, getState) => {
  const tutorialStep = +getSetting(getState(), 'Tutorial Step')

  // end
  if (tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS) {
    dispatch({
      type: 'tutorial',
      value: false
    })
  }
  // next
  else {
    dispatch({
      type: 'tutorialStep',
      value: !hint ? Math.floor(tutorialStep) + 1 : tutorialStep + 0.1
    })
  }

}

/** Disaddvances the tutorial one step (whole step by default; optional hint argument for fractional step). */
export const tutorialPrev = ({ hint } = {}) => (dispatch, getState) => {
  const tutorialStep = +getSetting(getState(), 'Tutorial Step')
  dispatch({ type: 'tutorialStep', value: !hint ? Math.floor(tutorialStep) - 1 : tutorialStep - 0.1 })
}
