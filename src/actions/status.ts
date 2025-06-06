import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Sets the connection status. */
const status = (state: State, { value }: { value: string }) => ({
  ...state,
  status: value,
})

/** Action-creator for status. */
export const statusActionCreator =
  (payload: Parameters<typeof status>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'status', ...payload })

export default _.curryRight(status)

// Register this action's metadata
registerActionMetadata('status', {
  undoable: false,
})
