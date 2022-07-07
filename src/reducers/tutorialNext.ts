import _ from 'lodash'
import State from '../@types/State'
import { TUTORIAL2_STEP_SUCCESS, TUTORIAL_STEP_SUCCESS } from '../constants'
import tutorial from '../reducers/tutorial'
import tutorialStepReducer from '../reducers/tutorialStep'
import getSetting from '../selectors/getSetting'

/** Advances the tutorial one step (whole step by default; optional hint argument for fractional step). */
const tutorialNext = (state: State, { hint }: { hint?: boolean }) => {
  const tutorialStep = +(getSetting(state, 'Tutorial Step') || 0)

  return tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS
    ? // end
      tutorial(state, {
        value: false,
      })
    : // next
      tutorialStepReducer(state, {
        value: !hint ? Math.floor(tutorialStep) + 1 : tutorialStep + 0.1,
      })
}

export default _.curryRight(tutorialNext)
