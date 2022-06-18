import expandBottom from '../reducers/expandBottom'
import Thunk from '../@types/Thunk'

/** Action-creator for expandBottom. */
const expandBottomActionCreator =
  (payload: Parameters<typeof expandBottom>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'expandBottom', ...payload })

export default expandBottomActionCreator
