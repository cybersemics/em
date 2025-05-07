import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

interface SetIsMulticursorExecutingPayload {
  value: boolean
  /** Label for the undo operation (typically the command name). */
  undoLabel?: string
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
      ...payload,
    })
  }

export default setIsMulticursorExecuting

registerActionMetadata('setIsMulticursorExecuting', {
  undoable: true,
})
