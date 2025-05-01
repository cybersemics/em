import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import settings from './settings'

/** Sets the Tutorial Choice Settings value. */
const tutorialChoice = (state: State, { value }: { value: number }) =>
  settings(state, {
    key: 'Tutorial Choice',
    value: value.toString(),
  })

/** Action-creator for tutorialChoice. */
export const tutorialChoiceActionCreator =
  (payload: Parameters<typeof tutorialChoice>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'tutorialChoice', ...payload })

export default _.curryRight(tutorialChoice)

// Register this action's metadata
registerActionMetadata('tutorialChoice', {
  undoable: false,
})
