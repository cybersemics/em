import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import tutorialStepReducer from '../actions/tutorialStep'
import getSetting from '../selectors/getSetting'

/** Disaddvances the tutorial one step (whole step by default; optional hint argument for fractional step). */
const tutorialPrev = (state: State, { hint }: { hint?: boolean } = {}) => {
  // @typescript-eslint/eslint-plugin does not yet support no-extra-parens with nullish coallescing operator
  // See: https://github.com/typescript-eslint/typescript-eslint/issues/1052
  // eslint-disable-next-line @typescript-eslint/no-extra-parens
  const tutorialStep = +(getSetting(state, 'Tutorial Step') ?? 0)

  return tutorialStepReducer(state, { value: !hint ? Math.floor(tutorialStep) - 1 : tutorialStep - 0.1 })
}

/** Action-creator for tutorialPrev. */
export const tutorialPrevActionCreator = (): Thunk => dispatch => dispatch({ type: 'tutorialPrev' })

export default _.curryRight(tutorialPrev)
