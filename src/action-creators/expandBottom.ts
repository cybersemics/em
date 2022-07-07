import Thunk from '../@types/Thunk'
import expandBottom from '../reducers/expandBottom'

/** Action-creator for expandBottom. */
const expandBottomActionCreator =
  (payload: Parameters<typeof expandBottom>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'expandBottom', ...payload })

export default expandBottomActionCreator
