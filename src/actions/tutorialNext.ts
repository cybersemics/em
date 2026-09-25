import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import tutorial from '../actions/tutorial'
import tutorialStepReducer from '../actions/tutorialStep'
import { TUTORIAL2_STEP_SUCCESS, TUTORIAL_STEP_SUCCESS } from '../constants'
import getSetting from '../selectors/getSetting'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'

/** Advances the tutorial one step (whole step by default; optional hint argument for fractional step). */
const tutorialNext = (state: State, { hint }: { hint?: boolean }, document?: ThoughtspaceTransaction) => {
  const tutorialStep = +(getSetting(state, 'Tutorial Step') || 0)

  return tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS
    ? // end
      tutorial(
        state,
        {
          value: false,
        },
        document,
      )
    : // next
      tutorialStepReducer(
        state,
        {
          value: !hint ? Math.floor(tutorialStep) + 1 : tutorialStep + 0.1,
        },
        document,
      )
}

/** Action-creator for tutorialNext. */
export const tutorialNextActionCreator =
  (payload: Parameters<typeof tutorialNext>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'tutorialNext', ...payload })

export default command(tutorialNext)

// Register this action's metadata
registerActionMetadata('tutorialNext', {
  undoable: false,
})
