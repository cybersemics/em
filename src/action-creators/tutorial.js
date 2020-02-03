import { store } from '../store.js'

// constants
import {
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL2_STEP_SUCCESS,
} from '../constants.js'

// util
import {
  getSetting,
} from '../util.js'

/** Advances the tutorial one step (whole step by default; optional hint argument for fractional step). */
export const tutorialNext = ({ hint } = {}) => {
  const tutorialStep = +getSetting('Tutorial Step')[0]

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
  const tutorialStep = +getSetting('Tutorial Step')[0]
  store.dispatch({ type: 'tutorialStep', value: !hint ? Math.floor(tutorialStep) - 1 : tutorialStep - 0.1 })
}

/** Returns true if the current tutorialStep is a hint */
export const isHint = () => {
  const tutorialStep = +getSetting('Tutorial Step')[0]
  return tutorialStep !== Math.floor(tutorialStep)
}
