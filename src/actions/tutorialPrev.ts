import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import tutorialStepReducer from '../actions/tutorialStep'
import getSetting from '../selectors/getSetting'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'

/** Disaddvances the tutorial one step (whole step by default; optional hint argument for fractional step). */
const tutorialPrev = (state: State, { hint }: { hint?: boolean } = {}, transaction?: ThoughtspaceTransaction) => {
  // @typescript-eslint/eslint-plugin does not yet support no-extra-parens with nullish coallescing operator
  // See: https://github.com/typescript-eslint/typescript-eslint/issues/1052
  const tutorialStep = +(getSetting(state, 'Tutorial Step') ?? 0)

  return tutorialStepReducer(state, { value: !hint ? Math.floor(tutorialStep) - 1 : tutorialStep - 0.1 }, transaction)
}

/** Action-creator for tutorialPrev. */
export const tutorialPrevActionCreator = (): Thunk => dispatch => dispatch({ type: 'tutorialPrev' })

export default command(tutorialPrev)

// Register this action's metadata
registerActionMetadata('tutorialPrev', {
  undoable: false,
})
