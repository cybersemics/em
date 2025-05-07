import _ from 'lodash'
import DragCommandZone from '../@types/DragCommandZone'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Reducer for setting the zone that the toolbar-button is being hovered over in the CustomizeToolbar modal. */
const dragCommandZone = (state: State, { zone }: { zone: DragCommandZone | null }) => ({
  ...state,
  dragCommandZone: zone,
})

/** Action-creator for dragCommandZone. */
export const dragCommandZoneActionCreator =
  (zone: DragCommandZone): Thunk =>
  dispatch => {
    dispatch([{ type: 'dragCommandZone', zone }])
  }

export default _.curryRight(dragCommandZone)

// Register this action's metadata
registerActionMetadata('dragCommandZone', {
  undoable: false,
})
