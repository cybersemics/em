import Thunk from '../@types/Thunk'
import setAttribute from '../reducers/setAttribute'

/** Action-creator for setAttribute. */
const setAttributeActionCreator =
  (payload: Parameters<typeof setAttribute>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'setAttribute', ...payload })

export default setAttributeActionCreator
