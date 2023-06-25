import DragShortcutZone from '../@types/DragShortcutZone'
import Thunk from '../@types/Thunk'

/** Action-creator for dragShortcutZone. */
const dragShortcutZoneActionCreator =
  (zone: DragShortcutZone): Thunk =>
  (dispatch, getState) => {
    dispatch([{ type: 'dragShortcutZone', zone }])
  }

export default dragShortcutZoneActionCreator
