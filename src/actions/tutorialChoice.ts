import State from '../@types/State'
import ThoughtspaceTransaction from '../@types/ThoughtspaceTransaction'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import command from '../util/command'
import settings from './settings'

/** Sets the Tutorial Choice Settings value. */
const tutorialChoice = (state: State, { value }: { value: number }, document?: ThoughtspaceTransaction) =>
  settings(
    state,
    {
      key: 'Tutorial Choice',
      value: value.toString(),
    },
    document,
  )

/** Action-creator for tutorialChoice. */
export const tutorialChoiceActionCreator =
  (payload: Parameters<typeof tutorialChoice>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'tutorialChoice', ...payload })

export default command(tutorialChoice)

// Register this action's metadata
registerActionMetadata('tutorialChoice', {
  undoable: false,
})
