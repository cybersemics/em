import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Real-time meta validation error status. */
const invalidState = (state: State, { value }: { value: string }) => ({
  ...state,
  invalidState: value,
})

/** Real-time meta validation error. It is dispatched by Editable handlers and is used by Bullet and ThoughtsAnnotation to make visual changes. */
export const setInvalidStateActionCreator =
  (value: boolean): Thunk =>
  (dispatch, getState) =>
    getState().invalidState !== value ? dispatch({ type: 'invalidState', value }) : null

export default _.curryRight(invalidState)

// Register this action's metadata
registerActionMetadata('invalidState', {
  undoable: false,
})
