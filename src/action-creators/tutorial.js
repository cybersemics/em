import { store } from '../store'

// constants
import {
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_STEP_SUCCESS,
} from '../constants'

// util
import {
  getSetting,
} from '../util'

/** Advances the tutorial one step (whole step by default; optional hint argument for fractional step). */
export const tutorialNext = ({ hint } = {}) => {
  const tutorialStep = +getSetting('Tutorial Step')

  // end
  if (tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS) {
    store.dispatch({
      type: 'tutorial',
      value: false
    })
  }
  // next
  else {
    store.dispatch({
      type: 'tutorialStep',
      value: !hint ? Math.floor(tutorialStep) + 1 : tutorialStep + 0.1
    })
  }

}

/** Disaddvances the tutorial one step (whole step by default; optional hint argument for fractional step). */
export const tutorialPrev = ({ hint } = {}) => {
  const tutorialStep = +getSetting('Tutorial Step')
  store.dispatch({ type: 'tutorialStep', value: !hint ? Math.floor(tutorialStep) - 1 : tutorialStep - 0.1 })
}
