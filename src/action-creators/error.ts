import Thunk from '../@types/Thunk'
import error from '../reducers/error'

/** Action-creator for error. */
const errorActionCreator =
  ({ value }: Parameters<typeof error>[1]): Thunk =>
  (dispatch, getState) => {
    if (value !== getState().error) {
      dispatch({ type: 'error', value })
    }
  }

export default errorActionCreator
