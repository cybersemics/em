import { TUTORIAL2_STEP_SUCCESS, TUTORIAL_STEP_SUCCESS } from '../constants'
import { tutorial, tutorialStep as tutorialStepReducer } from '../reducers'
import { getSetting } from '../selectors'
import { State } from '../util/initialState'

/** Advances the tutorial one step (whole step by default; optional hint argument for fractional step). */
const tutorialNext = (state: State, { hint }: { hint?: boolean } = {}) => {

  const tutorialStep = +(getSetting(state, 'Tutorial Step') || 0)

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
