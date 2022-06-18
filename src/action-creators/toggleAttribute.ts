import toggleAttribute from '../reducers/toggleAttribute'
import Thunk from '../@types/Thunk'

/** Action-creator for toggleAttribute. */
const toggleAttributeActionCreator =
  (payload: Parameters<typeof toggleAttribute>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleAttribute', ...payload })

export default toggleAttributeActionCreator
