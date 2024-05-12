import _ from 'lodash'
import DragShortcutZone from '../@types/DragShortcutZone'
import State from '../@types/State'
import Thunk from '../@types/Thunk'

/** Reducer for setting the zone that the toolbar-button is being hovered over in the CustomizeToolbar modal. */
const dragShortcutZone = (state: State, { zone }: { zone: DragShortcutZone | null }) => ({
  ...state,
  dragShortcutZone: zone,
})

/** Action-creator for dragShortcutZone. */
export const dragShortcutZoneActionCreator =
  (zone: DragShortcutZone): Thunk =>
  (dispatch, getState) => {
    dispatch([{ type: 'dragShortcutZone', zone }])
  }

export default _.curryRight(dragShortcutZone)
