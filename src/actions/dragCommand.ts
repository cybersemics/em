import _ from 'lodash'
import CommandId from '../@types/CommandId'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import { alertActionCreator as alert } from '../actions/alert'
import { AlertText, AlertType } from '../constants'
import { registerActionMetadata } from '../util/actionMetadata.registry'

/** Reducer for dragging a command in the customizeToolbar modal. */
const dragCommand = (state: State, { commandId }: { commandId: CommandId | null }) => ({
  ...state,
  dragCommand: commandId,
  ...(!commandId ? { dragCommandZone: null } : null),
})

/** Action-creator for dragCommand. */
export const dragCommandActionCreator =
  (commandId: CommandId | null): Thunk =>
  (dispatch, getState) => {
    const state = getState()
    const alertType = state.alert?.alertType
    const toolbarRect = document.getElementById('toolbar')?.getBoundingClientRect()
    const toolbarTop = toolbarRect?.top ?? 0
    const toolbarHeight = toolbarRect?.height ?? 0

    dispatch([
      // do not show the alert if the alert would cover the sticky toolbar
      commandId && toolbarTop >= toolbarHeight
        ? alert(AlertText.DragAndDropToolbar, {
            alertType: AlertType.DragAndDropToolbarHint,
            showCloseLink: false,
          })
        : alertType === AlertType.ToolbarButtonRemoveHint ||
            alertType === AlertType.DragAndDropToolbarAdd ||
            alertType === AlertType.DragAndDropToolbarHint
          ? alert(null)
          : null,
      { type: 'dragCommand', commandId },
    ])
  }

export default _.curryRight(dragCommand)

// Register this action's metadata
registerActionMetadata('dragCommand', {
  undoable: false,
})
