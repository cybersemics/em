import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import isMulticursorPath from '../selectors/isMulticursorPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import addMulticursor from './addMulticursor'
import removeMulticursor from './removeMulticursor'

/** Toggles a cursor in the multicursor set. */
export const toggleMulticursor = (state: State, payload: { path: Path }): State => {
  const { path } = payload

  if (isMulticursorPath(state, path)) return removeMulticursor(state, { path })
  else return addMulticursor(state, { path })
}

/** Action-creator for toggleMulticursor. */
export const toggleMulticursorActionCreator =
  (payload: Parameters<typeof toggleMulticursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toggleMulticursor', ...payload })

export default _.curryRight(toggleMulticursor)

// Register this action's metadata
registerActionMetadata('toggleMulticursor', {
  undoable: false,
})
