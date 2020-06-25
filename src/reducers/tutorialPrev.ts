import { getSetting } from '../selectors'
import { tutorialStep as tutorialStepReducer } from '../reducers'
import { State } from '../util/initialState'

/** Disaddvances the tutorial one step (whole step by default; optional hint argument for fractional step). */
const tutorialPrev = (state: State, { hint }: { hint?: boolean } = {}) => {
  const tutorialStep = +(getSetting(state, 'Tutorial Step') ?? 0) // eslint-disable-line no-extra-parens
  return tutorialStepReducer(state, { value: !hint ? Math.floor(tutorialStep) - 1 : tutorialStep - 0.1 })
}

export default tutorialPrev
