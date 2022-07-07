import Thunk from '../@types/Thunk'
import tutorialStep from '../reducers/tutorialStep'

/** Action-creator for tutorialStep. */
const tutorialStepActionCreator =
  (payload: Parameters<typeof tutorialStep>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'tutorialStep', ...payload })

export default tutorialStepActionCreator
