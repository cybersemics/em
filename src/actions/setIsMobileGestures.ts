import State from '../@types/State'
import Thunk from '../@types/Thunk'

interface SetIsMobileGesturesPayload {
  value: boolean
}

/** Sets the isMobileGestures flag. */
const setIsMobileGestures = (state: State, { value }: SetIsMobileGesturesPayload) => {
  return {
    ...state,
    isMobileGestures: value,
  }
}

/** Action-creator for setIsMobileGestures. */
export const setIsMobileGesturesActionCreator =
  (payload: SetIsMobileGesturesPayload): Thunk =>
  dispatch => {
    dispatch({
      type: 'setIsMobileGestures',
      ...payload,
    })
  }

export default setIsMobileGestures
