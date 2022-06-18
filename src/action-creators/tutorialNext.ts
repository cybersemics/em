import tutorialNext from '../reducers/tutorialNext'
import Thunk from '../@types/Thunk'

/** Action-creator for tutorialNext. */
const tutorialNextActionCreator =
  (payload: Parameters<typeof tutorialNext>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'tutorialNext', ...payload })

export default tutorialNextActionCreator
