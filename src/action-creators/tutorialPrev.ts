import Thunk from '../@types/Thunk'

/** Action-creator for tutorialPrev. */
const tutorialPrevActionCreator = (): Thunk => dispatch => dispatch({ type: 'tutorialPrev' })

export default tutorialPrevActionCreator
