import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import settings from '../actions/settings'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'

/** Sets the Tutorial Step settings value. */
const tutorialStep = (state: State, { value }: { value: number }, document?: ThoughtspaceTransaction) =>
  settings(
    state,
    {
      key: 'Tutorial Step',
      value: value.toString(),
    },
    document,
  )

/** Action-creator for tutorialStep. */
export const tutorialStepActionCreator =
  (payload: Parameters<typeof tutorialStep>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'tutorialStep', ...payload })

export default command(tutorialStep)

// Register this action's metadata
registerActionMetadata('tutorialStep', {
  undoable: false,
})
