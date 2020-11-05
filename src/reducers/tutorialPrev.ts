import _ from 'lodash'
import { getSetting } from '../selectors'
import { tutorialStep as tutorialStepReducer } from '../reducers'
import { State } from '../util/initialState'

/** Disaddvances the tutorial one step (whole step by default; optional hint argument for fractional step). */
const tutorialPrev = (state: State, { hint }: { hint?: boolean } = {}) => {

  // @typescript-eslint/eslint-plugin does not yet support no-extra-parens with nullish coallescing operator
  // See: https://github.com/typescript-eslint/typescript-eslint/issues/1052
  // eslint-disable-next-line @typescript-eslint/no-extra-parens
  const tutorialStep = +(getSetting(state, 'Tutorial Step') ?? 0)

  return tutorialStepReducer(state, { value: !hint ? Math.floor(tutorialStep) - 1 : tutorialStep - 0.1 })
}

export default _.curryRight(tutorialPrev)
