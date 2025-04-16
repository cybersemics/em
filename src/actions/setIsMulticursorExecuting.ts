import ActionType from '../@types/ActionType'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

interface SetIsMulticursorExecutingPayload {
  value: boolean
  commandType?: ActionType | CommandId
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
      commandType: payload.commandType,
    })
  }

export default setIsMulticursorExecuting
