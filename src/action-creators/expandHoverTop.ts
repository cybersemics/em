import expandHoverTop from '../reducers/expandHoverTop'
import Thunk from '../@types/Thunk'

/** Action-creator for expandHoverTop. */
const expandHoverTopActionCreator =
  (payload: Parameters<typeof expandHoverTop>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'expandHoverTop', ...payload })

export default expandHoverTopActionCreator
