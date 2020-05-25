// util
import { getSetting } from '../selectors'

// reducers
import tutorialStepReducer from './tutorialStep'

/** Disaddvances the tutorial one step (whole step by default; optional hint argument for fractional step). */
const tutorialPrev = (state, { hint } = {}) => {
  const tutorialStep = +getSetting(state, 'Tutorial Step')
  return tutorialStepReducer(state, { value: !hint ? Math.floor(tutorialStep) - 1 : tutorialStep - 0.1 })
}

export default tutorialPrev
