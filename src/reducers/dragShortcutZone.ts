import _ from 'lodash'
import DragShortcutZone from '../@types/DragShortcutZone'
import State from '../@types/State'

/** Reducer for setting the zone that the toolbar-button is being hovered over in the CustomizeToolbar modal. */
const dragShortcutZone = (state: State, { zone }: { zone: DragShortcutZone | null }) => ({
  ...state,
  dragShortcutZone: zone,
})

export default _.curryRight(dragShortcutZone)
