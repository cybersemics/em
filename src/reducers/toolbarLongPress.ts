import _ from 'lodash'
import DragToolbarZone from '../@types/DragToolbarZone'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import { AlertText, AlertType } from '../constants'
import alert from './alert'

interface Payload {
  shortcut: Shortcut | null
  sourceZone?: DragToolbarZone
}

/** Reducer for highlighting a toolbar button for dragging on tap and hold. */
const toolbarLongPress = (state: State, { shortcut, sourceZone }: Payload) => ({
  ...(shortcut
    ? alert(state, {
        value: AlertText.DragAndDropToolbar,
        alertType: AlertType.DragAndDropToolbarHint,
        showCloseLink: false,
      })
    : state),
  toolbarLongPress: shortcut,
  // Prevent setting new draggedThoughtRanked before, if previous value wasn't reset to undefined
  // draggedSimplePath: state.draggedSimplePath ? (!simplePath ? undefined : state.draggedSimplePath) : simplePath,
})

export default _.curryRight(toolbarLongPress)
