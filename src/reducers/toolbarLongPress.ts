import _ from 'lodash'
import DragShortcutZone from '../@types/DragShortcutZone'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertText, AlertType } from '../constants'
import alert from './alert'

interface Payload {
  shortcut: Shortcut | null
  sourceZone?: DragShortcutZone
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

/** Action-creator for long pressing a toolbar button in the customize modal. */
export const toolbarLongPressActionCreator =
  (payload: Parameters<typeof toolbarLongPress>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toolbarLongPress', ...payload })

export default _.curryRight(toolbarLongPress)
