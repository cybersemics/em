import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertType } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import hashPath from '../util/hashPath'

interface AddMulticursorPayload {
  /** The thought to add to the selection. */
  path: Path
  /** Let the added thought set the selection depth, clearing selected thoughts at other depths. */
  clearOtherDepths?: boolean
}

/** Adds a cursor to the multicursor set. */
const addMulticursor = (state: State, { path, clearOtherDepths }: AddMulticursorPayload): State => ({
  ...state,
  ...(state.alert?.alertType === AlertType.ScrollZoneHelp ? { alert: null } : null),
  multicursorAnchor: null,
  multicursorRange: {},
  multicursors: {
    ...(clearOtherDepths
      ? _.pickBy(state.multicursors, selectedPath => selectedPath.length === path.length)
      : state.multicursors),
    [hashPath(path)]: path,
  },
})

/** Action-creator for addMulticursor. */
export const addMulticursorActionCreator =
  (payload: Parameters<typeof addMulticursor>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'addMulticursor', ...payload })

export default _.curryRight(addMulticursor)

// Register this action's metadata
registerActionMetadata('addMulticursor', {
  undoable: false,
})
