import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import hashPath from '../util/hashPath'

/** Removes a cursor from the multicursor set. */
const removeMulticursor = (state: State, { path }: { path: Path }): State => {
  const { [hashPath(path)]: _, ...remainingMulticursors } = state.multicursors

  return {
    ...state,
    multicursors: remainingMulticursors,
  }
}

/** Action-creator for removeMulticursor. */
export const removeMulticursorActionCreator =
  (payload: Parameters<typeof removeMulticursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'removeMulticursor', ...payload })

export default _.curryRight(removeMulticursor)

// Register this action's metadata
registerActionMetadata('removeMulticursor', {
  undoable: false,
})
