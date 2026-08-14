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
  const removing = isMulticursorPath(state, path)
  const stateNew = removing ? removeMulticursor(state, { path }) : addMulticursor(state, { path })
  // Adding starts a new range. Removing commits the active range and preserves only a still-selected anchor.
  const multicursorAnchor = removing
    ? state.multicursorAnchor && isMulticursorPath(stateNew, state.multicursorAnchor)
      ? state.multicursorAnchor
      : null
    : path

  return { ...stateNew, multicursorAnchor }
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
