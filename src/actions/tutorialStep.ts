import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import settings from '../actions/settings'

/** Sets the Tutorial Step settings value. */
const tutorialStep = (state: State, { value }: { value: number }) =>
  settings(state, {
    key: 'Tutorial Step',
    value: value.toString(),
  })

/** Action-creator for tutorialStep. */
export const tutorialStepActionCreator =
  (payload: Parameters<typeof tutorialStep>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'tutorialStep', ...payload })

export default _.curryRight(tutorialStep)
