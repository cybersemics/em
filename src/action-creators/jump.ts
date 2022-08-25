import Thunk from '../@types/Thunk'

/** Action-creator for jump. */
const jumpActionCreator =
  (steps = 1): Thunk =>
  dispatch =>
    dispatch({ type: 'jump', steps })

export default jumpActionCreator
