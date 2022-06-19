import Thunk from '../@types/Thunk'

/** Action-creator for alertActive. */
const alertActiveActionCreator =
  (value: boolean): Thunk =>
  dispatch =>
    dispatch({ type: 'alertActive', value })

export default alertActiveActionCreator
