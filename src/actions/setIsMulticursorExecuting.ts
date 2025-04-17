import State from '../@types/State'
import Thunk from '../@types/Thunk'

interface SetIsMulticursorExecutingPayload {
  value: boolean
  /** Label for the undo operation (typically the command name) */
  operationLabel?: string
}

/** Sets the isMulticursorExecuting flag. */
const setIsMulticursorExecuting = (state: State, { value }: SetIsMulticursorExecutingPayload) => {
  return {
    ...state,
    isMulticursorExecuting: value,
  }
}

/** Action-creator for setIsMulticursorExecuting. */
export const setIsMulticursorExecutingActionCreator =
  (payload: SetIsMulticursorExecutingPayload): Thunk =>
  dispatch => {
    dispatch({
      type: 'setIsMulticursorExecuting',
      value: payload.value,
      operationLabel: payload.operationLabel,
    })
  }

export default setIsMulticursorExecuting
