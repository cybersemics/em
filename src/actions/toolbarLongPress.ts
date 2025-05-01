import _ from 'lodash'
import Command from '../@types/Command'
import DragCommandZone from '../@types/DragCommandZone'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { AlertText, AlertType } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import alert from './alert'

interface Payload {
  command: Command | null
  sourceZone?: DragCommandZone
}

/** Reducer for highlighting a toolbar button for dragging on tap and hold. */
const toolbarLongPress = (state: State, { command }: Payload) => ({
  ...(command
    ? alert(state, {
        value: AlertText.DragAndDropToolbar,
        alertType: AlertType.DragAndDropToolbarHint,
        showCloseLink: false,
      })
    : state),
  toolbarLongPress: command,
  // Prevent setting new draggedThoughtRanked before, if previous value wasn't reset to undefined
  // draggedSimplePath: state.draggedSimplePath ? (!simplePath ? undefined : state.draggedSimplePath) : simplePath,
})

/** Action-creator for long pressing a toolbar button in the customize modal. */
export const toolbarLongPressActionCreator =
  (payload: Parameters<typeof toolbarLongPress>[1]): Thunk =>
  dispatch =>
    dispatch({ type: 'toolbarLongPress', ...payload })

export default _.curryRight(toolbarLongPress)

// Register this action's metadata
registerActionMetadata('toolbarLongPress', {
  undoable: false,
})
